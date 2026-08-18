import json
import sys
import os

# Assuming running from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.recommendation.recommender import ParameterRecommender

def main():
    print("--- ToolGuard-AI Recommender Integration Example ---")
    
    # 1. Load configuration
    try:
        with open("configs/recommendation_config.json", "r") as f:
            config = json.load(f)
    except FileNotFoundError:
        print("Error: Could not find recommendation_config.json")
        return

    # 2. Instantiate recommender
    # (Note: Requires data/processed/future_wear_rate_h20.csv and results/phase9_configuration_performance.csv)
    print("Instantiating ParameterRecommender...")
    recommender = ParameterRecommender(config)
    
    # 3. Valid State Example
    print("\n[Example 1: Valid State]")
    current_state_valid = {"current_wear_um": 50.0}
    response_valid = recommender.recommend(current_state_valid)
    
    if response_valid['status'] == 'RECOMMENDATION_GENERATED':
        rec = response_valid['recommendation']
        print(f"Status: {response_valid['status']}")
        print(f"Recommended Observed Configuration: n={rec['n']} RPM, fz={rec['fz']} mm/tooth, Ap={rec['Ap']} mm")
    else:
        print(f"Status: {response_valid['status']}")
        print(f"Reason: {response_valid['reason']}")

    # 4. End-of-Life State Example (should trigger NO_RECOMMENDATION)
    print("\n[Example 2: Critical Wear State]")
    current_state_eol = {"current_wear_um": 280.0} # Wear too high, fails safety constraints
    response_eol = recommender.recommend(current_state_eol)
    
    if response_eol['status'] == 'RECOMMENDATION_GENERATED':
        print("Warning: Expected a rejection but got a recommendation!")
    else:
        print(f"Status: {response_eol['status']}")
        print(f"Reason: {response_eol.get('reason', 'Unknown')}")
        print("Action: Escalate to manual override. Do not substitute arbitrary parameters.")

    # 5. Missing State Example
    print("\n[Example 3: Invalid Input]")
    current_state_invalid = {"current_wear_um": None} 
    response_invalid = recommender.recommend(current_state_invalid)
    
    print(f"Status: {response_invalid['status']}")
    print(f"Reason: {response_invalid.get('reason', 'Unknown')}")

if __name__ == "__main__":
    main()
