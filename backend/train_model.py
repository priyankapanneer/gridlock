import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, r2_score

def load_and_prep_data(filepath):
    print("Loading data...")
    df = pd.read_csv(filepath)
    
    # Target variable: Duration in minutes
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce')
    df['closed_datetime'] = pd.to_datetime(df['closed_datetime'], errors='coerce')
    
    # Drop rows without a closing time or missing start time
    df = df.dropna(subset=['start_datetime', 'closed_datetime']).copy()
    
    # Calculate duration
    df['duration_minutes'] = (df['closed_datetime'] - df['start_datetime']).dt.total_seconds() / 60.0
    
    # Filter out invalid durations (e.g., negative or excessively long outliers like > 2 weeks)
    df = df[(df['duration_minutes'] > 0) & (df['duration_minutes'] < 20160)]
    
    # Feature Engineering
    df['hour'] = df['start_datetime'].dt.hour
    df['day_of_week'] = df['start_datetime'].dt.dayofweek
    
    # Select features
    features = [
        'latitude', 'longitude', 'event_type', 'event_cause', 
        'requires_road_closure', 'priority', 'police_station',
        'hour', 'day_of_week'
    ]
    
    # Ensure boolean is int or object for pipeline
    df['requires_road_closure'] = df['requires_road_closure'].astype(int)
    
    return df[features], df['duration_minutes']

def build_pipeline():
    numeric_features = ['latitude', 'longitude', 'hour', 'day_of_week', 'requires_road_closure']
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_features = ['event_type', 'event_cause', 'priority', 'police_station']
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])

    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', LGBMRegressor(n_estimators=200, learning_rate=0.05, random_state=42))
    ])
    
    return pipeline

def main():
    dataset_path = r'D:\gridlock\backend\app\dataset.csv'
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    X, y = load_and_prep_data(dataset_path)
    print(f"Dataset ready. Training on {len(X)} samples...")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = build_pipeline()
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"Model Training Complete!")
    print(f"MAE: {mae:.2f} minutes")
    print(f"R2 Score: {r2:.4f}")

    # Save model
    model_path = r'D:\gridlock\backend\app\ml_model.pkl'
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    main()
