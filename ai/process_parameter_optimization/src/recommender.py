"""
ToolGuard-AI Recommender Module
"""
import pandas as pd
from .candidate_generator import CandidateGenerator
from .constraints import ConstraintFilter
from .scoring import CandidateScorer

class ParameterRecommender:
    def __init__(self, config, historical_perf_path="results/phase9_configuration_performance.csv"):
        self.config = config
        self.generator = CandidateGenerator()
        self.constraint_filter = ConstraintFilter(config)
        self.scorer = CandidateScorer(config)
        
        # Load empirical performance for observed configurations
        try:
            perf_df = pd.read_csv(historical_perf_path)
            self.historical_perf = {}
            for _, row in perf_df.iterrows():
                # Store by tuple
                self.historical_perf[(row['n'], row['fz'], row['Ap'])] = row['mean_wear_rate']
        except FileNotFoundError:
            self.historical_perf = {}

    def recommend(self, current_state, current_material=None, current_coating=None):
        """
        Produce a recommendation for current tool state and context.
        """
        candidates = self.generator.get_candidates(current_material, current_coating)
        
        if not candidates:
            return {'status': 'NO_RECOMMENDATION', 'reason': 'No valid candidates for context'}
            
        feasible_candidates = []
        violations = []
        
        for cand in candidates:
            key = (cand['n'], cand['fz'], cand['Ap'])
            expected_rate = self.historical_perf.get(key)
            
            if expected_rate is None:
                violations.append({'candidate': cand, 'reason': 'No historical performance data'})
                continue
                
            is_feasible, reason = self.constraint_filter.is_feasible(cand, current_state, expected_rate)
            if not is_feasible:
                violations.append({'candidate': cand, 'reason': reason})
                continue
                
            feasible_candidates.append((cand, expected_rate))
            
        if not feasible_candidates:
            return {'status': 'NO_RECOMMENDATION', 'reason': 'All candidates violated constraints', 'violations': violations}
            
        # Score and rank 
        scored_candidates = self.scorer.score_all(feasible_candidates)
        
        # Rank by final heuristic score instead of raw productivity
        scored_candidates.sort(key=lambda x: x['heuristic_score'], reverse=True)
        
        best = scored_candidates[0]
        
        return {
            'status': 'RECOMMENDATION_GENERATED',
            'recommendation': {
                'n': best['n'],
                'fz': best['fz'],
                'Ap': best['Ap']
            },
            'expected_wear_rate': best['expected_wear_rate'],
            'productivity_metric': best['productivity_raw'],
            'alternatives': len(scored_candidates) - 1,
            'violations_count': len(violations)
        }
