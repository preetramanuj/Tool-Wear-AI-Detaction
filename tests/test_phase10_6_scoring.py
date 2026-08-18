import pytest
import sys
sys.path.append(".")
from src.recommendation.scoring import CandidateScorer

def test_normalization_invariance():
    config = {"weights": {"productivity_weight": 0.5, "tool_life_weight": 0.5}}
    scorer = CandidateScorer(config)
    
    # Candidate 1: Huge MRR (e.g. 5000), moderate wear (10)
    cand1 = ({'n': 50, 'fz': 10, 'Ap': 10}, 10)
    # Candidate 2: Small MRR (e.g. 50), excellent wear (5)
    cand2 = ({'n': 10, 'fz': 1, 'Ap': 5}, 5)
    
    scores = scorer.score_all([cand1, cand2])
    
    # Ensure they are outputting 0.0-1.0 normalized components
    for s in scores:
        assert 0.0 <= s['normalized_productivity_score'] <= 1.0
        assert 0.0 <= s['normalized_tool_life_score'] <= 1.0
        
def test_normalization_single_candidate():
    config = {"weights": {"productivity_weight": 0.5, "tool_life_weight": 0.5}}
    scorer = CandidateScorer(config)
    cand1 = ({'n': 50, 'fz': 10, 'Ap': 10}, 10)
    
    scores = scorer.score_all([cand1])
    assert scores[0]['normalized_productivity_score'] == 1.0
    assert scores[0]['normalized_tool_life_score'] == 1.0
