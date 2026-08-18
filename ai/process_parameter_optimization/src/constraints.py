"""
ToolGuard-AI Recommendation Constraints
"""

class ConstraintFilter:
    def __init__(self, config):
        self.config = config

    def is_feasible(self, candidate, current_state, expected_wear_rate):
        """
        Check if a candidate configuration is feasible under current hard constraints.
        candidate: dict with n, fz, Ap
        current_state: dict with current_wear_um, etc.
        expected_wear_rate: empirically estimated wear rate for this candidate
        """
        if self.config['policies'].get('safety_policy') == "REQUIRE_CURRENT_WEAR":
            if current_state.get('current_wear_um') is None:
                return False, "Missing current_wear"
                
        req_cycles = self.config['constraints'].get('required_cycles')
        max_wear = self.config['constraints'].get('max_wear_um', 250)
        
        if self.config['constraints'].get('enforce_rul_constraint'):
            if req_cycles is not None and current_state.get('current_wear_um') is not None:
                # Projected wear = current + rate * cycles
                projected_wear = current_state['current_wear_um'] + expected_wear_rate * req_cycles
                if projected_wear > max_wear:
                    return False, f"RUL Constraint Violation (Projected {projected_wear:.1f} > {max_wear})"
                    
        return True, "Valid"
