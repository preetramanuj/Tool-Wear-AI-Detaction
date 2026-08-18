"""
ToolGuard-AI Recommendation Candidates Module
"""
import pandas as pd

class CandidateGenerator:
    def __init__(self, data_path="data/processed/future_wear_rate_h20.csv"):
        self.data_path = data_path
        self._load_candidates()

    def _load_candidates(self):
        df = pd.read_csv(self.data_path)
        # Exclude Set 1 entirely as mandated
        df = df[df['Set'] != 1].copy()
        
        # Valid parameters are exactly those observed
        valid_configs = df[['n', 'fz', 'Ap', 'material', 'Coating']].drop_duplicates()
        self.candidates = valid_configs.to_dict('records')
        
    def get_candidates(self, current_material=None, current_coating=None):
        """
        Returns physically observed combinations.
        If context is provided, only return candidates valid for that context.
        """
        valid_cands = []
        for cand in self.candidates:
            if current_material is not None and cand['material'] != current_material:
                continue
            if current_coating is not None and cand['Coating'] != current_coating:
                continue
            valid_cands.append(cand)
        return valid_cands
