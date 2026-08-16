from pathlib import Path
from ai.health_prediction.inference.image_inference import ImageOnlyInference
from ai.health_prediction.models.tool_health_predictor import ToolHealthPredictor

class UnifiedWearPipeline:
    """
    The final website integration contract.
    Path A (Sensor Available) -> Existing Multimodal Model (Placeholder)
    Path B (Sensor Not Available) -> Image-Only Model
    """
    def __init__(self, image_model_path="models/health_prediction/image_only_wear/model.pt"):
        self.image_model = ImageOnlyInference(image_model_path)
        
    def predict(self, image_input, sensor_data=None):
        """
        End-to-end inference flow supporting optional sensor data.
        """
        warnings = []
        
        if sensor_data is not None:
            # PATH A: Multimodal
            # return self.multimodal_model.predict(image_input, sensor_data)
            raise NotImplementedError("Multimodal integration via wrapper is placeholder. Call multimodal model directly for now.")
        else:
            # PATH B: Image Only Fallback
            wear_result = self.image_model.predict(image_input)
            mode = "image_only"
            # Add explicit limitation warning dynamically or based on final model
            warnings.append("IMAGE_ONLY_FALLBACK: Using the image-only fallback model. Please refer to model_metadata.json for the latest performance metrics and limitations.")
            
        # Tool Health Layer
        health_result = ToolHealthPredictor.predict_health(wear_result["wear_um"])
        
        # Merge results to exactly match the requested website contract
        return {
            "wear_um": wear_result["wear_um"],
            "health": health_result["health_status"],
            "mode": mode,
            "warnings": warnings,
            "tool_health_metadata": health_result
        }
