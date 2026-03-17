import triton_python_backend_utils as pb_utils
import numpy as np
from faster_whisper import WhisperModel
import os

class TritonPythonModel:
    def initialize(self, args):
        model_path = os.path.join(os.path.dirname(__file__), "weights")
        self.model = WhisperModel(
            model_path,
            device="cpu",
            compute_type="int8",
            cpu_threads=4
        )

    def execute(self, requests):
        responses = []
        for request in requests:
            in_tensor = pb_utils.get_input_tensor_by_name(request, "AUDIO_SIGNAL")
            audio_numpy = in_tensor.as_numpy().flatten().astype(np.float32)

            print(f"[Whisper Python] Received audio samples: {len(audio_numpy)}, Max: {np.max(audio_numpy):.4f}, Min: {np.min(audio_numpy):.4f}")

            # Use vad_filter to prevent hallucinations during silence
            # initial_prompt helps with medical terms and language biasing
            segments, _ = self.model.transcribe(
                audio_numpy, 
                beam_size=2, 
                vad_filter=True,
                initial_prompt="Medical consultation, clinical notes."
            )
            
            segment_list = list(segments)
            text = "".join([s.text for s in segment_list])
            
            print(f"[Whisper Python] Inference done. Result length: {len(text)}")

            # Encode as UTF-8 for Triton TYPE_STRING
            out_tensor = pb_utils.Tensor("TRANSCRIPT", np.array([text.encode('utf-8')], dtype=object))
            responses.append(pb_utils.InferenceResponse([out_tensor]))

        return responses