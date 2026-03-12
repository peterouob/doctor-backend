from transformers import AutoTokenizer, AutoModelForCausalLM
import os

# Qwen2.5-3B-Instruct is a balanced choice for medical transcription/summarization tasks
model_id = "Qwen/Qwen2.5-0.5B-Instruct"
save_path = os.path.join(os.path.dirname(__file__), "../ai_model_repo/llm/1/weights")

print(f"Loading {model_id}...")

# Download tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.save_pretrained(save_path)

# Download model
# Note: Using safetensors=True and device_map="cpu" to just download and save (it will be loaded by Triton/Venv later)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    use_safetensors=True,
    trust_remote_code=True
)
model.save_pretrained(save_path)

print(f"Model saved to {save_path}")
