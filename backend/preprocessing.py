import pandas as pd
from sklearn.model_selection import train_test_split

# Load raw data
data = pd.read_csv("chess_games.csv")

# Feature extraction
data["move_accuracy"] = data["engine_score"] / data["position_complexity"]
data["time_consistency"] = abs(data["time_per_move"] - data["average_time"])

# Label encoding (cheating: 1, fair: 0)
data["label"] = data["is_cheating"].apply(lambda x: 1 if x == "yes" else 0)

# Split data into training and testing sets
X = data[["move_accuracy", "time_consistency", "position_complexity"]]
y = data["label"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Save preprocessed data
X_train.to_csv("X_train.csv", index=False)
X_test.to_csv("X_test.csv", index=False)
y_train.to_csv("y_train.csv", index=False)
y_test.to_csv("y_test.csv", index=False)
