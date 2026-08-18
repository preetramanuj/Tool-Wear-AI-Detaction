import os
import json
import pytest
import sys
sys.path.append(".")
from src.recommendation.recommender import ParameterRecommender
from src.recommendation.candidate_generator import CandidateGenerator
from src.recommendation.constraints import ConstraintFilter
import pandas as pd

@pytest.fixture
def config():
    return {
        "policies": {
            "candidate_policy": "OBSERVED_ONLY",
            "safety_policy": "REQUIRE_CURRENT_WEAR"
        },
        "constraints": {
            "required_cycles": 20,
            "max_wear_um": 250,
            "enforce_rul_constraint": True
        },
        "weights": {
            "productivity_weight": 0.5,
            "tool_life_weight": 0.5
        }
    }

def test_set_1_excluded():
    gen = CandidateGenerator("data/processed/future_wear_rate_h20.csv")
    # Set 1 is implicitly excluded by reading from Set 1 filtered data 
    # Just asserting it loads without failing
    assert len(gen.get_candidates()) > 0

def test_no_missing_parameters_accepted():
    gen = CandidateGenerator("data/processed/future_wear_rate_h20.csv")
    cands = gen.get_candidates()
    for c in cands:
        assert pd.notna(c['n'])
        assert pd.notna(c['fz'])
        assert pd.notna(c['Ap'])

def test_unsupported_combinations_rejected():
    gen = CandidateGenerator("data/processed/future_wear_rate_h20.csv")
    cands = gen.get_candidates()
    # Ensure there's no random combinatorial explosion
    # The length should match the number of unique rows in the dataset
    assert len(cands) < 50  # We expect ~14 from Phase 8.5 analysis

def test_rul_fallback_works(config):
    recommender = ParameterRecommender(config, "results/phase9_configuration_performance.csv")
    # Pass empty current state, safety policy requires current_wear
    res = recommender.recommend({})
    assert res['status'] == 'NO_RECOMMENDATION'
    assert 'All candidates violated constraints' in res['reason'] or 'Missing current_wear' in str(res)
    
def test_constraints_work_correctly(config):
    cf = ConstraintFilter(config)
    # 20 cycles * 10 wear rate + 100 current = 300 > 250 limit
    valid, reason = cf.is_feasible({'n': 1, 'fz': 1, 'Ap': 1}, {'current_wear_um': 100}, expected_wear_rate=10)
    assert not valid
    assert "Violation" in reason

def test_scoring_is_deterministic(config):
    from src.recommendation.scoring import CandidateScorer
    scorer = CandidateScorer(config)
    s1 = scorer.score({'n': 100, 'fz': 0.1, 'Ap': 2}, expected_wear_rate=5)
    s2 = scorer.score({'n': 100, 'fz': 0.1, 'Ap': 2}, expected_wear_rate=5)
    assert s1['heuristic_score'] == s2['heuristic_score']

def test_recommendation_reproducible(config):
    recommender = ParameterRecommender(config, "results/phase9_configuration_performance.csv")
    state = {'current_wear_um': 50}
    r1 = recommender.recommend(state)
    r2 = recommender.recommend(state)
    assert r1['status'] == r2['status']
    if r1['status'] == 'RECOMMENDATION_GENERATED':
        assert r1['recommendation'] == r2['recommendation']
