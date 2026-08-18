"""
ToolGuard-AI Recommendation Scoring
"""

class CandidateScorer:
    def __init__(self, config):
        self.w_prod = config['weights'].get('productivity_weight', 0.5)
        self.w_life = config['weights'].get('tool_life_weight', 0.5)

    def score_all(self, feasible_candidates):
        """
        Calculates and normalizes scores across a pool of currently feasible candidates.
        This ensures raw mrr scale (thousands) doesn't inherently dominate wear scale (tens).
        feasible_candidates is a list of tuples: (candidate_dict, expected_wear_rate)
        """
        if not feasible_candidates:
            return []
            
        raw_metrics = []
        for cand, exp_wear in feasible_candidates:
            mrr = cand['n'] * cand['fz'] * cand['Ap']
            raw_metrics.append({
                'candidate': cand,
                'expected_wear_rate': exp_wear,
                'productivity_raw': mrr,
                'wear_rate_raw': exp_wear
            })
            
        # Extract for normalization
        prod_values = [x['productivity_raw'] for x in raw_metrics]
        wear_values = [x['wear_rate_raw'] for x in raw_metrics]
        
        min_prod, max_prod = min(prod_values), max(prod_values)
        min_wear, max_wear = min(wear_values), max(wear_values)
        
        # Calculate final scores
        scored_candidates = []
        for metrics in raw_metrics:
            # Min-max normalization mapping to 0.0 - 1.0
            if max_prod == min_prod:
                norm_prod = 1.0
            else:
                norm_prod = (metrics['productivity_raw'] - min_prod) / (max_prod - min_prod)
                
            if max_wear == min_wear:
                norm_wear = 1.0 # If all same wear, don't penalize unequally
            else:
                # Lower wear is better, so we invert wear
                # 1.0 means lowest wear in set, 0.0 means highest wear
                norm_wear = 1.0 - ((metrics['wear_rate_raw'] - min_wear) / (max_wear - min_wear))
                
            final_score = self.w_prod * norm_prod + self.w_life * norm_wear
            
            cand_info = dict(metrics['candidate'])
            cand_info.update({
                'expected_wear_rate': metrics['expected_wear_rate'],
                'productivity_raw': metrics['productivity_raw'],
                'wear_rate_raw': metrics['wear_rate_raw'],
                'normalized_productivity_score': norm_prod,
                'normalized_tool_life_score': norm_wear,
                'heuristic_score': final_score
            })
            scored_candidates.append(cand_info)
            
        return scored_candidates
