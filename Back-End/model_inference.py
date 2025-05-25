import sys
from tensorflow.keras.models import load_model # type: ignore
import numpy as np
import cv2

# Load model
model = load_model('./best_model.h5')

def predict(image_path):
    # Load and preprocess the image
    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (256, 256))  # <-- matches model input
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    # Predict
    prediction = model.predict(img)
    print("Prediction array:", prediction)

    return prediction.argmax(axis=1)

if __name__ == "__main__":
    image_path = sys.argv[1]
    result = predict(image_path)
    class_labels = {
        0: "Glioma",
        1: "Meningioma",
        2: "No Tumor",
        3: "Pituitary"
    }

    predicted_label = class_labels[result[0]]
    print(f"Predicted tumor type: {predicted_label}")
