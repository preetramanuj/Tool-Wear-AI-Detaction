import torch
import torch.nn as nn
from torchvision import models


class LateFusionWearModel(nn.Module):
    """
    Multimodal tool-wear regression model.

    Inputs:
        img:
            Preprocessed RGB image tensor of shape:
            (batch_size, 3, 384, 384)

        sensor:
            StandardScaler-normalized RMS sensor features
            of shape:
            (batch_size, 5)

    Output:
        Continuous wear prediction of shape:
        (batch_size, 1)
    """

    def __init__(self, sensor_dim: int = 5, embedding_dim: int = 256):
        super().__init__()

        # ---------------------------------------------------------
        # Vision branch
        # ---------------------------------------------------------
        self.cnn = models.efficientnet_b0(weights=None)

        cnn_out_dim = self.cnn.classifier[1].in_features

        # Remove EfficientNet's original classifier
        self.cnn.classifier = nn.Identity()

        self.vision_projector = nn.Sequential(
            nn.Linear(cnn_out_dim, embedding_dim),
            nn.LayerNorm(embedding_dim),
            nn.ReLU(),
        )

        # ---------------------------------------------------------
        # Sensor branch
        # ---------------------------------------------------------
        self.sensor_mlp = nn.Sequential(
            nn.Linear(sensor_dim, 64),
            nn.ReLU(),
            nn.Linear(64, embedding_dim),
            nn.LayerNorm(embedding_dim),
            nn.ReLU(),
        )

        # ---------------------------------------------------------
        # Late-fusion regression head
        # ---------------------------------------------------------
        self.regressor = nn.Sequential(
            nn.Linear(embedding_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
        )

    def forward(
        self,
        img: torch.Tensor,
        sensor: torch.Tensor,
    ) -> torch.Tensor:

        # Image embedding
        vision_features = self.cnn(img)
        vision_embedding = self.vision_projector(vision_features)

        # Sensor embedding
        sensor_embedding = self.sensor_mlp(sensor)

        # Late fusion
        fused_features = torch.cat(
            (vision_embedding, sensor_embedding),
            dim=1,
        )

        # Wear regression
        prediction = self.regressor(fused_features)

        return prediction