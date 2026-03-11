import json
import triton_python_backend_utils as pb_utils
import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import os

class TritonPythonModel:
    def initialize(self, args):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        model_path = os.path.join(
            os.path.dirname(__file__),  # /models/whisper/1/
            "weights"
        )

        self.processor = AutoProcessor.from_pretrained(model_path)
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_path,
            dtype=self.torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True
        ).to(self.device)
        self.model.eval()

        # 我們預期收到的就是 16kHz，不再需要動態判斷
        self.target_sample_rate = 16000

    def execute(self, requests):
        responses = []
        for request in requests:
            # 1. 取得 Go 傳來的 16kHz float32 音訊張量
            in_tensor = pb_utils.get_input_tensor_by_name(request, "AUDIO_SIGNAL")
            audio_numpy = in_tensor.as_numpy()

            if audio_numpy.ndim == 0 :
                audio_numpy = np.array([audio_numpy])
            audio_signal_1d = audio_numpy.flatten()

            # 2. 直接轉為 PyTorch Tensor (跳過 torchaudio 降頻步驟！)
            audio_tensor = torch.from_numpy(audio_signal_1d).float()
            # 3. 提取特徵並推論
            inputs = self.processor(
                audio_tensor,
                sampling_rate=self.target_sample_rate,
                return_tensors="pt"
            )
            input_features = inputs.input_features.to(self.device, dtype=self.torch_dtype)

            with torch.no_grad():
                predicted_ids = self.model.generate(input_features)

            transcription = self.processor.batch_decode(
                predicted_ids, skip_special_tokens=True
            )[0]

            # 4. 封裝並回傳
            out_tensor = pb_utils.Tensor(
                "TRANSCRIPT",
                np.array([transcription.encode('utf-8')], dtype=object)
            )
            responses.append(pb_utils.InferenceResponse(output_tensors=[out_tensor]))

        return responses

    def finalize(self):
        self.model = None
        self.processor = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()