# syntax=docker/dockerfile:1
FROM nvcr.io/nvidia/tritonserver:23.10-py3

# 啟用 BuildKit 快取機制，將 pip 下載的 .whl 暫存起來
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip

# 強制下載 CPU 版 PyTorch，並且使用快取
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch --index-url https://download.pytorch.org/whl/cpu

# 下載 transformers 與 numpy，同樣使用快取
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install transformers numpy huggingface_hub faster-whisper
