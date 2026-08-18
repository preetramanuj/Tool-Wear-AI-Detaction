import torch
import torch.nn as nn
from ai.wear_analysis.models.phase3a_wrapper import Phase3AUnifiedModel

class Phase3BGatedModel(Phase3AUnifiedModel):
    def __init__(self, target_scaler=None, sensor_dim=5, embedding_dim=256):
        super().__init__(target_scaler=target_scaler, sensor_dim=sensor_dim, embedding_dim=embedding_dim)
        
        fusion_in_dim = embedding_dim * 2 + 2 # 514
        self.gate_network = nn.Sequential(
            nn.Linear(fusion_in_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim),
            nn.Sigmoid()
        )
        self.last_gate_activations = None

    def forward(self, image, sensor, mask):
        v_emb = self.vision_projector(self.cnn(image)) * mask[:, 0:1]
        sens_emb = self.sensor_mlp(sensor) * mask[:, 1:2]
        
        fusion_context = torch.cat([v_emb, sens_emb, mask], dim=1)
        
        gate = self.gate_network(fusion_context)
        self.last_gate_activations = gate.detach()
        
        gated_sensor = gate * sens_emb
        
        fused = torch.cat([v_emb, gated_sensor, mask], dim=1)
        
        return self.regressor(fused)
        
    @torch.no_grad()
    def predict(self, image, sensor_features=None):
        out = super().predict(image, sensor_features)
        out['model_version'] = 'ToolGuard-AI-WearAnalysis-Phase3B-Final-v1.0'
        return out
