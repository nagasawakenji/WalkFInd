from dataclasses import dataclass
from typing import List
from PIL import Image
import io
import torch
import open_clip

@dataclass
class OpenClipEmbedder:
    model_name: str
    pretrained: str

    def __post_init__(self):
        self.device = "cpu"
        # open_clip.create_model_and_transforms returns:
        #   (model, preprocess_train, preprocess_val)
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            self.model_name,
            pretrained=self.pretrained,
            device=self.device,
        )
        self.model.eval()

    @torch.inference_mode()
    def encode_image_bytes(self, image_bytes: bytes) -> List[float]:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        x = self.preprocess(img).unsqueeze(0).to(self.device)  # (1, C, H, W)
        feat = self.model.encode_image(x)                      # (1, D)
        feat = feat / feat.norm(dim=-1, keepdim=True)         # 正規化（cos類似度用）
        return feat.squeeze(0).cpu().numpy().astype("float32").tolist()