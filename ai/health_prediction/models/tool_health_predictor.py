class ToolHealthPredictor:
    """
    Consumes wear predictions (in micrometers) and outputs health status.
    
    IMPORTANT LIMITATION:
    The generic thresholds used here (150.0 and 250.0) are placeholders 
    derived from typical flank wear guidelines. They are NOT scientifically 
    validated thresholds for the MATWI dataset. The project documentation 
    does not currently define exact health categories.
    """
    
    # Generic UNVALIDATED placeholders (in micrometers)
    THRESHOLD_WARNING = 150.0
    THRESHOLD_CRITICAL = 250.0
    
    @classmethod
    def predict_health(cls, wear_um: float) -> dict:
        """
        Maps a continuous wear prediction to a health category.
        """
        if wear_um < 0:
            wear_um = 0.0 # Clamp negative predictions
            
        if wear_um < cls.THRESHOLD_WARNING:
            status = "HEALTHY"
            action = "None"
        elif wear_um < cls.THRESHOLD_CRITICAL:
            status = "WARNING"
            action = "Prepare replacement tool"
        else:
            status = "CRITICAL"
            action = "Replace tool immediately"
            
        return {
            "wear_um": round(wear_um, 2),
            "health_status": status,
            "recommended_action": action,
            "note": "Thresholds are unvalidated placeholders."
        }
