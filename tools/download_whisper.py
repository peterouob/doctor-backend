# download_model.py
import os
from huggingface_hub import snapshot_download

model_id = "Systran/faster-whisper-small"
save_path = os.path.join(os.path.dirname(__file__), "../ai_model_repo/whisper/1/weights")

snapshot_download(
    repo_id=model_id,
    local_dir=save_path,
)

print("download success")