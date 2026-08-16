import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

class ImageOnlyWearModel(nn.Module):
    """
    Image-Only Wear Analysis Model using EfficientNet-B0 transfer learning.
    This model predicts tool wear in micrometers (\u00b5m) based solely on image input.
    """
    def __init__(self, pretrained=True, freeze_backbone=False):
        super().__init__()
        
        # Load EfficientNet-B0
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        self.backbone = efficientnet_b0(weights=weights)
        
        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False
                
        # Replace the final classification head with a regression head
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, 1)
        )
        
    def forward(self, x):
        # x expected shape: (B, 3, 384, 384)
        out = self.backbone(x)
        return out.squeeze(-1) # Output shape: (B,)
