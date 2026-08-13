# AI-Based Tool Wear Detection and Tool Life Prediction Using Image Processing

> **Smart India Hackathon (SIH) 2026**\
> An AI-powered computer vision and predictive maintenance system for
> automatic cutting-tool wear assessment and Remaining Useful Life (RUL)
> prediction.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-green)
![TensorFlow](https://img.shields.io/badge/TensorFlow-Deep%20Learning-orange)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![React](https://img.shields.io/badge/React-Dashboard-61DAFB)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![Industry
4.0](https://img.shields.io/badge/Industry%204.0-Smart%20Manufacturing-purple)
![SDG
9](https://img.shields.io/badge/SDG%209-Industry%20%26%20Innovation-red)
![SDG
12](https://img.shields.io/badge/SDG%2012-Responsible%20Production-green)

------------------------------------------------------------------------

## 📌 Table of Contents

-   [Overview](#-overview)
-   [Problem Statement](#-problem-statement)
-   [Why Tool Wear Matters](#-why-tool-wear-matters)
-   [Objectives](#-objectives)
-   [Proposed Solution](#-proposed-solution)
-   [System Architecture](#-system-architecture)
-   [How It Works](#-how-it-works)
-   [AI/ML Pipeline](#-aiml-pipeline)
-   [Tool Wear Detection](#-tool-wear-detection)
-   [Tool Life Prediction](#-tool-life-prediction)
-   [Key Features](#-key-features)
-   [Innovation / USP](#-innovation--usp)
-   [Technology Stack](#-technology-stack)
-   [Hardware Requirements](#-hardware-requirements)
-   [Software Requirements](#-software-requirements)
-   [Dataset](#-dataset)
-   [Dataset Structure](#-dataset-structure)
-   [Preprocessing](#-preprocessing)
-   [Model Strategy](#-model-strategy)
-   [Evaluation Metrics](#-evaluation-metrics)
-   [Project Structure](#-project-structure)
-   [Installation](#-installation)
-   [Running the Project](#-running-the-project)
-   [API Overview](#-api-overview)
-   [Dashboard](#-dashboard)
-   [Alerts and Maintenance](#-alerts-and-maintenance)
-   [Economic and Sustainability
    Impact](#-economic-and-sustainability-impact)
-   [Industry 4.0 Alignment](#-industry-40-alignment)
-   [SDG Alignment](#-sdg-alignment)
-   [Advantages](#-advantages)
-   [Limitations](#-limitations)
-   [Future Scope](#-future-scope)
-   [Development Roadmap](#-development-roadmap)
-   [Team Roles](#-team-roles)
-   [Hackathon Demo Flow](#-hackathon-demo-flow)
-   [Expected Outcomes](#-expected-outcomes)
-   [Contributing](#-contributing)
-   [License](#-license)
-   [Acknowledgements](#-acknowledgements)

------------------------------------------------------------------------

## 🔎 Overview

Manufacturing cutting tools gradually degrade during machining. If wear
is detected too late, the result can be poor surface finish, dimensional
errors, tool breakage, rejected components, machine downtime, higher
production cost, and unnecessary safety risks.

This project proposes a **non-contact, image-based AI system** that
captures images of a cutting tool, detects and quantifies visible wear,
classifies its severity, and predicts the tool's **Remaining Useful Life
(RUL)**.

The system is designed around **Computer Vision + Deep Learning +
Predictive Analytics + Smart Manufacturing**.

### Core idea

``` text
Tool Image
    ↓
Image Preprocessing
    ↓
Wear Region Detection
    ↓
CNN / Vision Model
    ↓
Wear Classification + Wear Measurement
    ↓
Temporal Wear Analysis
    ↓
RUL Prediction
    ↓
Risk Score + Maintenance Recommendation
    ↓
Dashboard + Alert
```

------------------------------------------------------------------------

# 🎯 Problem Statement

## The industrial challenge

A cutting tool does not normally fail immediately. Wear develops
progressively through machining operations.

Manufacturing teams therefore face a difficult decision:

### Replace too early

-   Usable tool life is wasted
-   Tool consumption increases
-   Production cost increases
-   Material and resource usage increases

### Replace too late

-   Product quality deteriorates
-   Dimensional accuracy may be affected
-   Tool breakage becomes more likely
-   Machine downtime increases
-   Rework and scrap increase
-   Maintenance becomes reactive

### The missing capability

> **Accurately estimating the current condition of a tool and predicting
> when it should be replaced.**

This project addresses that gap using AI-powered image analysis.

------------------------------------------------------------------------

# ⚠️ Why Tool Wear Matters

Common wear and damage modes include:

  Wear / Failure Mode   Potential Manufacturing Effect
  --------------------- -------------------------------------------------
  Flank wear            Poor surface finish and dimensional variation
  Crater wear           Reduced cutting performance
  Chipping              Surface defects and unstable cutting
  Cracks                Possible premature tool failure
  Edge deformation      Reduced machining accuracy
  Thermal damage        Accelerated degradation
  Tool fracture         Unplanned stoppage and potential equipment risk

------------------------------------------------------------------------

# 🎯 Objectives

1.  Capture cutting-tool images using a camera.
2.  Automatically identify the tool region.
3.  Detect visible wear and damage.
4.  Classify tool condition into meaningful wear stages.
5.  Quantify visible wear where the dataset supports measurement.
6.  Track wear progression over machining cycles.
7.  Predict Remaining Useful Life (RUL).
8.  Generate a tool-health/risk score.
9.  Provide maintenance recommendations.
10. Display results through a real-time dashboard.
11. Reduce unnecessary tool replacement.
12. Support predictive maintenance and smart manufacturing.
13. Provide explainable AI visualizations for operator confidence.

------------------------------------------------------------------------

# 💡 Proposed Solution

The proposed system combines four major layers:

### 1. Vision Layer

A camera captures the tool after defined machining intervals or during
an available inspection window.

### 2. AI Detection Layer

Computer vision and deep learning identify:

-   Tool location
-   Wear region
-   Wear severity
-   Possible damage/anomalies

### 3. Prediction Layer

Historical wear measurements are combined with operating-cycle
information to estimate:

-   Current health
-   Wear trend
-   Remaining Useful Life
-   Estimated replacement window

### 4. Decision Layer

The system converts predictions into actionable information:

-   Healthy
-   Monitor
-   Maintenance Recommended
-   Critical / Replace

------------------------------------------------------------------------

# 🏗️ System Architecture

``` text
                   ┌─────────────────────┐
                   │   CNC / Machine     │
                   │   Machining Process  │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Industrial Camera   │
                   │ / Inspection Camera │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Image Acquisition   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ OpenCV Preprocessing│
                   │ Crop / Resize /     │
                   │ Normalize / Denoise │
                   └──────────┬──────────┘
                              │
                              ▼
             ┌────────────────────────────────┐
             │       AI Vision Pipeline       │
             │                                │
             │ Detection / Classification /   │
             │ Segmentation / Feature Extract │
             └───────────────┬────────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │ Wear Severity / Wear   │
                 │ Measurement / Features │
                 └────────────┬───────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │ Temporal Wear Analysis  │
                 └────────────┬───────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │ RUL Prediction Model   │
                 │ RF / XGBoost / LSTM    │
                 └────────────┬───────────┘
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
          ┌─────────────────┐   ┌──────────────────┐
          │ Risk / Health   │   │ Maintenance      │
          │ Score           │   │ Recommendation   │
          └────────┬────────┘   └────────┬─────────┘
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │ FastAPI Backend     │
                   └──────────┬──────────┘
                              ▼
                   ┌─────────────────────┐
                   │ React Dashboard     │
                   │ Charts / Alerts /   │
                   │ Tool History / RUL  │
                   └─────────────────────┘
```

------------------------------------------------------------------------

# ⚙️ How It Works

## Step 1 --- Image Acquisition

A camera captures an image of the cutting tool.

Recommended considerations:

-   Fixed camera position
-   Controlled illumination
-   Consistent background
-   Fixed focus
-   Stable distance
-   Repeatable inspection orientation

Consistency is important because the AI should learn **tool wear**, not
changes in lighting or camera position.

------------------------------------------------------------------------

## Step 2 --- Image Preprocessing

OpenCV performs operations such as:

-   Resize
-   Crop
-   Color-space conversion
-   Noise reduction
-   Contrast enhancement
-   Normalization
-   Background removal where appropriate
-   Region of Interest (ROI) extraction

Example pipeline:

``` text
Raw Image
   ↓
Resize
   ↓
ROI Detection
   ↓
Denoising
   ↓
Contrast Enhancement
   ↓
Normalization
   ↓
AI Model
```

------------------------------------------------------------------------

## Step 3 --- Wear Detection

The model identifies the tool and the visible wear region.

Possible approaches:

### Classification

``` text
Input Image
     ↓
CNN
     ↓
Healthy / Mild / Moderate / Severe
```

### Object Detection

``` text
Input Image
     ↓
Detection Model
     ↓
Tool + Wear Bounding Box
```

### Segmentation

``` text
Input Image
     ↓
Segmentation Model
     ↓
Pixel-level Wear Mask
```

For a stronger SIH prototype, **segmentation or wear-region
localization** is preferable to only classifying the complete image.

------------------------------------------------------------------------

# 🤖 AI/ML Pipeline

## Recommended MVP

### Stage A --- Baseline

Use transfer learning with:

-   MobileNetV3
-   EfficientNet
-   ResNet

Purpose:

> Quickly establish a reliable wear-classification baseline.

### Stage B --- Wear Localization

Use a detection/segmentation model if sufficient annotated data is
available.

Purpose:

> Show the exact area where wear is detected.

### Stage C --- Feature Extraction

Extract features such as:

-   Wear-area ratio
-   Edge characteristics
-   Texture
-   Shape
-   Bounding-box dimensions
-   Segmentation-mask area
-   Visual severity score

### Stage D --- RUL Prediction

Use historical observations:

``` text
Inspection 1 → Wear = low
Inspection 2 → Wear = low-medium
Inspection 3 → Wear = medium
Inspection 4 → Wear = high
Inspection 5 → Wear = critical
```

The model learns the trend and estimates when the tool is likely to
reach the replacement threshold.

------------------------------------------------------------------------

# 🔬 Tool Wear Detection

## Wear classes

A practical prototype can begin with:

``` text
Class 0 → Healthy
Class 1 → Mild Wear
Class 2 → Moderate Wear
Class 3 → Severe Wear
Class 4 → Critical / Damaged
```

The number of classes should be changed according to the available
dataset and ground-truth labeling.

------------------------------------------------------------------------

## Optional continuous wear score

Instead of only categorical output:

``` text
Tool Health Score = 0–100
```

Example:

``` text
Health Score : 82
Wear Level   : Mild
Risk         : Low
```

Later:

``` text
Health Score : 31
Wear Level   : Severe
Risk         : High
```

------------------------------------------------------------------------

# 📈 Tool Life Prediction

## Remaining Useful Life (RUL)

RUL is the estimated amount of usable operating time/cycles remaining
before the tool reaches a predefined replacement or critical-wear
threshold.

Example:

``` text
Current wear          : 62%
Predicted RUL         : 18 machining cycles
Risk                  : Medium
Recommendation        : Plan replacement
```

> The actual units and prediction target should be determined by the
> dataset. If the dataset contains machining cycles rather than hours,
> predict cycles instead of inventing an hour-based estimate.

------------------------------------------------------------------------

## Prediction approaches

### Option 1 --- XGBoost / Random Forest

Input:

-   Current wear score
-   Wear area
-   Wear progression
-   Machining cycles
-   Material/tool information where available

Output:

``` text
Predicted RUL
```

### Option 2 --- LSTM

Useful when enough sequential observations are available.

``` text
Wear(t-3)
Wear(t-2)
Wear(t-1)
Wear(t)
   ↓
 LSTM
   ↓
 RUL
```

### Recommended hackathon strategy

Start with **XGBoost/Random Forest as a strong baseline**, then
demonstrate LSTM/temporal modeling as an advanced extension if the
dataset supports it.

------------------------------------------------------------------------

# 🚀 Key Features

## 1. Automatic Tool Wear Detection

No manual visual inspection is required for every inspection sample.

------------------------------------------------------------------------

## 2. Tool Health Score

Convert AI output into an easy-to-understand health indicator.

``` text
100 ───────── Healthy
 75 ───────── Monitor
 50 ───────── Attention
 25 ───────── Critical
  0 ───────── Replace
```

Thresholds should be configurable.

------------------------------------------------------------------------

## 3. Remaining Useful Life Prediction

Predict how much operating life remains.

------------------------------------------------------------------------

## 4. Explainable AI

Use methods such as **Grad-CAM** to show the image region that
influenced the CNN prediction.

Example:

``` text
Original Image
      +
AI Heatmap
      ↓
Highlighted Wear Region
```

This helps engineers understand and validate model decisions.

------------------------------------------------------------------------

## 5. Real-Time Alerts

Trigger notifications when:

-   Wear exceeds threshold
-   RUL becomes low
-   Rapid degradation is detected
-   Model confidence is low
-   Critical damage is identified

------------------------------------------------------------------------

# 🌟 Innovation / USP

## 1. Predictive Maintenance Scheduler

Instead of simply saying:

> "Tool is worn."

The system recommends:

> "Schedule replacement during the next planned maintenance window."

This converts AI output into an operational decision.

------------------------------------------------------------------------

## 2. Multi-Tool Monitoring

The architecture can support multiple tools/machines.

``` text
Machine 01 → Tool A → Healthy
Machine 01 → Tool B → Moderate
Machine 02 → Tool C → Critical
Machine 03 → Tool D → Healthy
```

This makes the solution scalable beyond a single demonstration.

------------------------------------------------------------------------

## 3. Explainable AI for Industrial Trust

Show the exact visual region responsible for the prediction.

This is especially valuable in industrial environments where operators
need evidence rather than a black-box score.

------------------------------------------------------------------------

## 4. Cost-Benefit Dashboard

Estimate:

-   Potential downtime avoided
-   Tools saved through condition-based replacement
-   Scrap/rework reduction
-   Maintenance events
-   Estimated resource savings

Use configurable assumptions rather than claiming guaranteed financial
savings.

------------------------------------------------------------------------

## 5. Digital Tool Health Timeline

Maintain a complete history for each tool:

``` text
Tool ID: T-001

Cycle 100 → Healthy
Cycle 250 → Mild Wear
Cycle 400 → Moderate Wear
Cycle 550 → Severe Wear
Cycle 650 → Replacement Recommended
```

This creates a lightweight **digital twin / digital thread** for the
tool.

------------------------------------------------------------------------

## 6. Confidence-Aware AI

Do not blindly trust a prediction.

Example:

``` text
Prediction: Severe Wear
Confidence: 96%
Action: Alert operator
```

If confidence is low:

``` text
Prediction: Moderate Wear
Confidence: 54%
Action: Request manual inspection
```

This improves safety and practical usability.

------------------------------------------------------------------------

# 🧰 Technology Stack

## Programming Languages

  Technology                Use
  ------------------------- -------------------------------
  Python                    AI, image processing, backend
  JavaScript / TypeScript   Frontend
  HTML / CSS                UI
  SQL                       Database

------------------------------------------------------------------------

## Computer Vision

  Technology     Purpose
  -------------- ------------------------------------
  OpenCV         Image preprocessing
  Pillow         Image handling
  NumPy          Numerical operations
  scikit-image   Optional advanced image processing

------------------------------------------------------------------------

## AI / Machine Learning

  Technology           Purpose
  -------------------- -------------------------------------
  TensorFlow / Keras   Deep learning
  PyTorch              Alternative deep learning framework
  scikit-learn         Classical ML and evaluation
  XGBoost              RUL regression
  Grad-CAM             Explainability

Use **one primary deep-learning framework** in the final implementation
to keep the project maintainable.

------------------------------------------------------------------------

## Models

### Classification

-   EfficientNet
-   ResNet
-   MobileNetV3

### Detection

-   YOLO-family detector where appropriate

### Segmentation

-   U-Net
-   YOLO segmentation variants
-   Other lightweight segmentation architectures

### RUL Prediction

-   Random Forest Regressor
-   XGBoost Regressor
-   LSTM / GRU for sequential data

------------------------------------------------------------------------

## Data and Annotation

Recommended tools:

-   CVAT
-   LabelImg
-   Roboflow

Annotation types:

``` text
Classification → Wear class
Detection     → Bounding box
Segmentation  → Wear mask
Regression    → Wear/RUL value
```

------------------------------------------------------------------------

## Backend

``` text
FastAPI
Pydantic
Uvicorn
```

------------------------------------------------------------------------

## Frontend

``` text
React
TypeScript
Charting library
Responsive CSS
```

------------------------------------------------------------------------

## Database

Recommended:

``` text
PostgreSQL
```

For a small local prototype:

``` text
SQLite
```

------------------------------------------------------------------------

## Deployment

Recommended options:

``` text
Docker
        +
FastAPI
        +
React
        +
PostgreSQL
```

For edge deployment:

``` text
NVIDIA Jetson device
        +
Optimized AI model
        +
Industrial camera
```

------------------------------------------------------------------------

# 📷 Hardware Requirements

## Minimum Prototype

-   Laptop/desktop
-   Webcam or USB camera
-   Cutting-tool samples
-   Controlled lighting
-   Stable camera mount

## Recommended Demonstration Setup

-   Industrial/USB camera
-   Fixed illumination
-   Camera stand
-   Tool holder
-   GPU-enabled development system

## Optional Edge Deployment

-   NVIDIA Jetson-class edge device
-   Industrial camera
-   Machine interface
-   Local network connectivity

------------------------------------------------------------------------

# 💾 Dataset

The system requires images of tools captured at different wear stages.

A strong dataset should include:

-   Multiple tool IDs
-   Multiple wear levels
-   Different machining cycles
-   Different lighting conditions
-   Different tool orientations
-   Ground-truth wear measurements where possible
-   RUL/end-of-life information where available

### Important

Avoid data leakage.

If multiple images come from the same physical tool, do not randomly
distribute near-identical images from that same tool across training and
test sets without considering tool-level separation.

A better evaluation strategy is:

``` text
Training → Tool IDs A–N
Validation → Different tool IDs
Testing → Unseen tool IDs
```

This better measures generalization to new tools.

------------------------------------------------------------------------

# 📁 Dataset Structure

Suggested structure:

``` text
data/
├── raw/
│   ├── tool_001/
│   ├── tool_002/
│   └── tool_003/
│
├── processed/
│   ├── train/
│   ├── val/
│   └── test/
│
├── annotations/
│   ├── classification/
│   ├── detection/
│   └── segmentation/
│
└── metadata/
    └── tool_history.csv
```

Example metadata:

``` csv
tool_id,image_path,cycle,wear_value,wear_class,rul
T001,images/T001_001.jpg,100,0.12,mild,550
T001,images/T001_002.jpg,200,0.19,mild,450
T001,images/T001_003.jpg,300,0.34,moderate,350
```

The exact columns depend on the selected dataset.

------------------------------------------------------------------------

# 🧹 Preprocessing

Recommended steps:

1.  Remove corrupted images.
2.  Check image dimensions.
3.  Crop tool ROI.
4.  Normalize image size.
5.  Normalize pixel values.
6.  Remove irrelevant background where appropriate.
7.  Apply controlled augmentation.

Possible augmentation:

-   Small rotations
-   Translation
-   Mild brightness variation
-   Small scale changes
-   Horizontal flip only when physically valid

Avoid augmentations that create unrealistic tool geometry.

------------------------------------------------------------------------

# 🧠 Model Strategy

## Phase 1 --- Baseline

``` text
Image
  ↓
Resize
  ↓
Pretrained CNN
  ↓
Wear Class
```

Goal:

> Establish a measurable baseline quickly.

------------------------------------------------------------------------

## Phase 2 --- Localization

``` text
Image
  ↓
Detection / Segmentation
  ↓
Wear Region
```

Goal:

> Make the system more explainable and measurable.

------------------------------------------------------------------------

## Phase 3 --- Feature Engineering

``` text
Wear Mask
   ↓
Area / Shape / Texture Features
   ↓
Feature Vector
```

------------------------------------------------------------------------

## Phase 4 --- RUL Prediction

``` text
Feature Vector
+
Machining History
+
Current Wear
      ↓
Regression / Sequence Model
      ↓
RUL
```

------------------------------------------------------------------------

# 📊 Evaluation Metrics

## Classification

Use:

-   Accuracy
-   Precision
-   Recall
-   F1-score
-   Confusion Matrix
-   ROC-AUC where appropriate

For industrial fault detection, **recall for severe/critical wear** is
especially important.

------------------------------------------------------------------------

## Detection

Use:

-   Precision
-   Recall
-   mAP
-   IoU

------------------------------------------------------------------------

## Segmentation

Use:

-   IoU
-   Dice Score
-   Precision
-   Recall

------------------------------------------------------------------------

## RUL Regression

Use:

-   MAE
-   RMSE
-   R²
-   Prediction error distribution

Example:

``` text
Actual RUL     = 120 cycles
Predicted RUL  = 112 cycles
Absolute Error = 8 cycles
```

------------------------------------------------------------------------

# 📂 Project Structure

``` text
tool-wear-ai/
│
├── README.md
├── LICENSE
├── .gitignore
├── requirements.txt
├── docker-compose.yml
├── .env.example
│
├── data/
│   ├── raw/
│   ├── processed/
│   ├── annotations/
│   └── metadata/
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_preprocessing.ipynb
│   ├── 03_classification.ipynb
│   └── 04_rul_prediction.ipynb
│
├── src/
│   ├── preprocessing/
│   │   ├── image_preprocessing.py
│   │   └── roi_detection.py
│   │
│   ├── models/
│   │   ├── classifier.py
│   │   ├── detector.py
│   │   ├── segmenter.py
│   │   └── rul_model.py
│   │
│   ├── inference/
│   │   └── predict.py
│   │
│   ├── explainability/
│   │   └── gradcam.py
│   │
│   └── utils/
│       └── config.py
│
├── backend/
│   ├── main.py
│   ├── api/
│   ├── schemas/
│   └── services/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── models/
│   ├── classifier/
│   ├── detector/
│   └── rul/
│
├── tests/
│
└── deployment/
    ├── Dockerfile
    └── docker-compose.yml
```

------------------------------------------------------------------------

# 💻 Installation

## 1. Clone the repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd tool-wear-ai
```

## 2. Create a virtual environment

### Windows

``` bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux/macOS

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

## 3. Install Python dependencies

``` bash
pip install -r requirements.txt
```

## 4. Configure environment variables

Copy:

``` bash
.env.example
```

to:

``` bash
.env
```

Example:

``` env
MODEL_PATH=models/classifier/model.keras
DATABASE_URL=sqlite:///./toolwear.db
API_HOST=0.0.0.0
API_PORT=8000
```

Never commit secrets to GitHub.

------------------------------------------------------------------------

# ▶️ Running the Project

## Start Backend

``` bash
uvicorn backend.main:app --reload
```

Backend will expose the API locally.

## Start Frontend

``` bash
cd frontend
npm install
npm run dev
```

## Run model inference

Example:

``` bash
python -m src.inference.predict --image path/to/tool.jpg
```

Example conceptual output:

``` text
Tool ID       : T001
Wear Class    : Moderate
Confidence    : 94.2%
Health Score  : 63
Predicted RUL : 142 cycles
Risk Level    : Medium
Action        : Continue + monitor
```

The exact CLI arguments should be updated to match the implemented code.

------------------------------------------------------------------------

# 🔌 API Overview

Suggested endpoints:

  Method   Endpoint             Purpose
  -------- -------------------- -------------------------------
  GET      `/health`            API health check
  POST     `/predict`           Analyze uploaded tool image
  POST     `/predict/rul`       Predict remaining useful life
  GET      `/tools`             List registered tools
  GET      `/tools/{tool_id}`   Tool history
  GET      `/alerts`            Active alerts
  POST     `/tools`             Register a tool
  GET      `/metrics`           System/model metrics

Example request:

``` http
POST /predict
Content-Type: multipart/form-data
```

Example response:

``` json
{
  "tool_id": "T001",
  "wear_class": "moderate",
  "confidence": 0.942,
  "health_score": 63,
  "predicted_rul": 142,
  "risk": "medium",
  "recommendation": "Continue machining and monitor"
}
```

This JSON is an example API contract; actual field names should match
the implementation.

------------------------------------------------------------------------

# 📊 Dashboard

The dashboard should provide:

## Main screen

``` text
┌──────────────────────────────────────────────┐
│             TOOL HEALTH MONITOR              │
├───────────────┬──────────────┬───────────────┤
│ Tool Health   │ Wear Level   │ Predicted RUL │
│     63/100    │  Moderate    │  142 cycles   │
├───────────────┴──────────────┴───────────────┤
│                                              │
│             Tool Image                       │
│       + AI Wear Heatmap                      │
│                                              │
├──────────────────────────────────────────────┤
│ Wear Trend                                   │
│  ▲                                           │
│  │       ╭──────                              │
│  │   ╭───╯                                    │
│  └──────────────────────────→ Cycles          │
├──────────────────────────────────────────────┤
│ Recommendation: Monitor                      │
└──────────────────────────────────────────────┘
```

Recommended dashboard cards:

-   Tool ID
-   Current wear
-   Health score
-   RUL
-   Confidence
-   Risk level
-   Wear trend
-   Last inspection
-   Recommended action
-   Maintenance history

------------------------------------------------------------------------

# 🚨 Alerts and Maintenance

## Alert levels

### 🟢 Normal

``` text
Wear is within acceptable range.
```

### 🟡 Warning

``` text
Wear is increasing.
Monitor tool closely.
```

### 🟠 Maintenance

``` text
RUL is approaching configured threshold.
Plan replacement.
```

### 🔴 Critical

``` text
Critical wear/damage detected.
Stop/inspect according to plant safety procedure.
```

Thresholds must be configurable according to the actual tool, process,
and industrial validation requirements.

------------------------------------------------------------------------

# 💰 Economic and Sustainability Impact

The system aims to improve manufacturing economics by enabling
**condition-based tool replacement** instead of relying only on fixed
schedules or waiting for failure.

Potential benefits:

-   Reduced unnecessary tool replacement
-   Reduced scrap and rework
-   Reduced unplanned downtime
-   Better maintenance planning
-   Improved tool utilization
-   Better production consistency
-   Potential reduction in material and energy waste

### Important

The project should report **measured results from experiments** rather
than claiming guaranteed savings.

------------------------------------------------------------------------

# 🌱 Industry 4.0 Alignment

The solution supports major Industry 4.0 principles:

  Industry 4.0 Concept          Project Implementation
  ----------------------------- -----------------------------------
  Smart sensing                 Camera-based inspection
  AI/ML                         Wear detection and RUL prediction
  Automation                    Automated inspection
  Predictive maintenance        RUL estimation
  Edge computing                Optional local inference
  Data analytics                Tool history and trends
  Digital twin                  Digital tool-health profile
  Connectivity                  API / machine integration
  Human-machine collaboration   Operator dashboard and alerts

------------------------------------------------------------------------

# 🌍 SDG Alignment

## SDG 9 --- Industry, Innovation and Infrastructure

The project contributes to:

-   Industrial innovation
-   Smart manufacturing
-   AI adoption in manufacturing
-   Digital transformation
-   Intelligent infrastructure
-   Predictive maintenance

### SDG 9 connection

``` text
AI + Computer Vision
        ↓
Smart Inspection
        ↓
Predictive Maintenance
        ↓
Efficient Manufacturing Infrastructure
```

------------------------------------------------------------------------

## SDG 12 --- Responsible Consumption and Production

The project supports:

-   Reduced tool wastage
-   Reduced production scrap
-   Better resource utilization
-   Condition-based maintenance
-   More responsible manufacturing

### SDG 12 connection

``` text
Accurate Wear Detection
        ↓
Use Tool for Its Useful Life
        ↓
Avoid Premature Replacement
        ↓
Reduce Waste
        ↓
Responsible Production
```

------------------------------------------------------------------------

# ✅ Advantages

-   Non-contact inspection
-   Automated analysis
-   Reduces dependency on manual inspection
-   Supports predictive rather than purely reactive maintenance
-   Scalable architecture
-   Explainable AI capability
-   Can work at the edge
-   Can integrate with existing software through APIs
-   Supports multiple tools
-   Provides historical tool-health tracking
-   Aligns with Industry 4.0
-   Directly supports SDG 9 and SDG 12

------------------------------------------------------------------------

# ⚠️ Limitations

The prototype should explicitly acknowledge these limitations:

### 1. Image quality

Poor lighting, reflections, blur, or occlusion can reduce accuracy.

### 2. Dataset dependency

AI performance depends heavily on dataset quality and diversity.

### 3. Domain shift

A model trained on one tool/material/machine may not automatically
generalize to another.

### 4. Wear visibility

Not all forms of tool degradation are visually observable from a single
image.

### 5. RUL uncertainty

RUL depends on machining conditions such as:

-   Cutting speed
-   Feed rate
-   Depth of cut
-   Workpiece material
-   Coolant
-   Tool material/coating
-   Machine condition

Therefore, image-only RUL prediction should be presented as an estimate,
not an absolute guarantee.

### 6. Industrial validation

A hackathon prototype is not equivalent to a production-certified
industrial monitoring system. Real deployment requires validation under
representative operating conditions.

------------------------------------------------------------------------

# 🔮 Future Scope

## 1. Multimodal Monitoring

Combine images with:

-   Vibration
-   Acoustic emission
-   Spindle current
-   Cutting force
-   Temperature
-   Machine telemetry

Architecture:

``` text
Image ─────────────┐
Vibration ─────────┤
Current ────────────┤
Temperature ────────┤
                    ▼
             Multimodal AI
                    ▼
              Tool Health
                    ▼
                  RUL
```

This can improve robustness when image-only information is insufficient.

------------------------------------------------------------------------

## 2. Edge AI

Deploy the trained model directly on an edge device for low-latency
inference and reduced dependence on cloud connectivity.

------------------------------------------------------------------------

## 3. CNC / MES Integration

Potential integration with:

-   CNC controllers
-   Manufacturing Execution Systems
-   Maintenance Management Systems
-   Industrial IoT platforms

------------------------------------------------------------------------

## 4. Fleet-Level Analytics

Monitor hundreds of tools across multiple machines.

``` text
Factory
 ├── Machine 01
 │    ├── Tool A
 │    └── Tool B
 │
 ├── Machine 02
 │    ├── Tool C
 │    └── Tool D
 │
 └── Machine 03
      ├── Tool E
      └── Tool F
```

------------------------------------------------------------------------

## 5. Self-Learning System

With carefully controlled feedback and validation, future versions can
learn from:

-   New tool types
-   New machining conditions
-   Operator feedback
-   Maintenance outcomes

------------------------------------------------------------------------

# 🗺️ Development Roadmap

## Phase 1 --- Research

-   [ ] Study tool wear mechanisms
-   [ ] Study available datasets
-   [ ] Define wear classes
-   [ ] Define RUL target
-   [ ] Define evaluation protocol

## Phase 2 --- Dataset

-   [ ] Collect images
-   [ ] Clean images
-   [ ] Annotate wear
-   [ ] Create metadata
-   [ ] Split by tool ID
-   [ ] Perform augmentation

## Phase 3 --- AI

-   [ ] Train baseline CNN
-   [ ] Evaluate classification
-   [ ] Add localization/segmentation
-   [ ] Extract wear features
-   [ ] Build RUL baseline
-   [ ] Evaluate RUL prediction
-   [ ] Add explainability

## Phase 4 --- Application

-   [ ] Build FastAPI backend
-   [ ] Build database
-   [ ] Build React dashboard
-   [ ] Add image upload/inference
-   [ ] Add tool history
-   [ ] Add alerts

## Phase 5 --- SIH Demo

-   [ ] Prepare live/demo dataset
-   [ ] Prepare dashboard
-   [ ] Demonstrate wear progression
-   [ ] Demonstrate RUL prediction
-   [ ] Demonstrate explainable AI
-   [ ] Demonstrate maintenance recommendation
-   [ ] Present sustainability impact
-   [ ] Measure and report model performance

------------------------------------------------------------------------

# 👥 Suggested Team Roles

## AI/ML Developer

Responsible for:

-   Dataset
-   CNN
-   Detection/segmentation
-   RUL prediction
-   Model evaluation

## Computer Vision Developer

Responsible for:

-   Camera pipeline
-   OpenCV
-   ROI detection
-   Image preprocessing
-   Wear measurement

## Backend Developer

Responsible for:

-   FastAPI
-   Database
-   APIs
-   Model serving

## Frontend Developer

Responsible for:

-   React dashboard
-   Charts
-   Alerts
-   Tool history
-   UX

## Hardware / IoT Developer

Responsible for:

-   Camera setup
-   Edge device
-   Machine integration
-   Data acquisition

## Research / Presentation Lead

Responsible for:

-   Problem validation
-   Industry research
-   SDG mapping
-   Cost-benefit analysis
-   SIH presentation and documentation

One person can handle multiple roles in a small team.

------------------------------------------------------------------------

# 🏆 Hackathon Demo Flow

For the SIH internal presentation, demonstrate the complete journey:

### 1. Show the industrial problem

``` text
Worn tool
   ↓
Poor machining
   ↓
Defect / downtime / waste
```

### 2. Show your camera

Capture the tool image.

### 3. Run AI inference

``` text
Image
 ↓
AI
 ↓
Wear = Moderate
Confidence = 94%
```

### 4. Show the wear region

Display the original image beside the AI heatmap/mask.

### 5. Show the trend

``` text
Cycle → Wear
100   → 10%
200   → 18%
300   → 32%
400   → 48%
500   → 63%
```

### 6. Show RUL

``` text
Estimated RUL = 142 cycles
```

### 7. Show decision

``` text
Risk = Medium
Action = Plan maintenance
```

### 8. Show impact

``` text
Reduced unnecessary replacement
↓
Reduced waste
↓
Better maintenance planning
↓
Smart manufacturing
```

------------------------------------------------------------------------

# 📌 Expected Outcomes

The final prototype should demonstrate:

-   Automated tool image analysis
-   Wear classification
-   Wear localization/measurement where supported
-   RUL estimation
-   Tool-health scoring
-   Explainable AI
-   Historical trend visualization
-   Maintenance recommendations
-   Real-time or near-real-time dashboard
-   Scalable API architecture

Model performance should be reported using actual experimental results.

Do not insert fabricated accuracy/RUL numbers into the final SIH
presentation. Report the values obtained from your validation dataset.

------------------------------------------------------------------------

# 🔐 Data and Security Considerations

For industrial deployment:

-   Keep machine credentials outside source control.
-   Store secrets in environment variables or a secret manager.
-   Avoid committing raw proprietary production images.
-   Use authentication for production APIs.
-   Apply role-based access where required.
-   Log predictions and model versions.
-   Keep model/version metadata for traceability.

------------------------------------------------------------------------

# 🧪 Testing Strategy

Test at multiple levels:

## Unit Tests

-   Image preprocessing
-   Feature extraction
-   API validation
-   RUL calculation

## Model Tests

-   Classification performance
-   Detection/segmentation performance
-   RUL error
-   Confidence calibration

## Integration Tests

``` text
Camera/Image
    ↓
Preprocessing
    ↓
Model
    ↓
API
    ↓
Database
    ↓
Dashboard
```

## Robustness Tests

Evaluate under controlled changes in:

-   Lighting
-   Background
-   Tool orientation
-   Image quality
-   Tool type
-   Machining condition

------------------------------------------------------------------------

# 📈 Success Metrics for SIH

A strong internal-round evaluation can focus on:

  Category            Metric
  ------------------- -----------------------------------------
  AI accuracy         F1 / Recall / Precision
  Wear localization   IoU / Dice / mAP
  RUL                 MAE / RMSE
  Speed               Inference latency
  Usability           Dashboard workflow
  Reliability         Low-confidence handling
  Innovation          Explainability + predictive maintenance
  Impact              Waste/downtime reduction potential
  Scalability         Multi-tool architecture
  Sustainability      SDG 9 + SDG 12 contribution

------------------------------------------------------------------------

# 🏭 Final Vision

The long-term goal is not merely to build an image classifier.

The goal is to create an **AI-powered Tool Health Intelligence
Platform**:

``` text
             SMART FACTORY
                  │
       ┌──────────┴──────────┐
       │                     │
   Machine Data          Tool Images
       │                     │
       └──────────┬──────────┘
                  ▼
             AI ENGINE
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     Wear       Health      RUL
   Detection    Score    Prediction
        │         │         │
        └─────────┼─────────┘
                  ▼
          Predictive Action
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    Alert     Maintenance  Analytics
                  │
                  ▼
          SMART MANUFACTURING
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
     SDG 9                  SDG 12
 Innovation             Responsible
 & Infrastructure        Production
```

------------------------------------------------------------------------

# 🤝 Contributing

Contributions are welcome.

Suggested workflow:

``` bash
git checkout -b feature/your-feature
```

Make changes, test them, then:

``` bash
git add .
git commit -m "Add: your feature"
git push origin feature/your-feature
```

Create a Pull Request describing:

-   Problem solved
-   Changes made
-   Testing performed
-   Screenshots where relevant

------------------------------------------------------------------------

# 📄 License

This project is intended for educational, research, and hackathon
development.

The repository can use the **MIT License** unless your institution, SIH
team, dataset, or external research source requires a different license.

If external datasets are used, their original licenses and attribution
requirements must be followed.

------------------------------------------------------------------------

# 🙏 Acknowledgements

This project is developed as a **Smart India Hackathon internal-round
prototype** focused on:

-   Artificial Intelligence
-   Computer Vision
-   Predictive Maintenance
-   Smart Manufacturing
-   Industry 4.0
-   Sustainable Production

Special acknowledgement should be given to the creators and maintainers
of any datasets, libraries, frameworks, research papers, and tools used
in the final implementation.

------------------------------------------------------------------------

## ⭐ Project Tagline

> **"See the Wear. Predict the Life. Prevent the Downtime."**

------------------------------------------------------------------------

## 📌 Status

**Project Stage:** SIH Internal Round Prototype

**Current Focus:**

``` text
Computer Vision
+
Tool Wear Detection
+
RUL Prediction
+
Explainable AI
+
Predictive Maintenance
+
Industry 4.0
+
SDG 9 & SDG 12
```

> **Note:** Sections describing future models, integrations, hardware,
> or deployment are proposed architecture unless those components have
> already been implemented in this repository. Update the README as the
> implementation progresses.
