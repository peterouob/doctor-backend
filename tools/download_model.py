# download_model.py
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq

model_id = "openai/whisper-small"
save_path = "../ai_model_repo/whisper/1/weights"

processor = AutoProcessor.from_pretrained(model_id)
processor.save_pretrained(save_path)

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id,
    use_safetensors=True
)
model.save_pretrained(save_path)

print("下載完成！")