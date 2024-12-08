from fastapi import APIRouter
import base64
from io import BytesIO
from .utils import analyze_image
from schema import ImageData
from PIL import Image

router = APIRouter()

@router.post('/')
async def run(data: ImageData):
    try:
        # Decode image data from base64
        image_data = base64.b64decode(data.image.split(",")[1])  # Assumes data:image/png;base64,<data>
        image_bytes = BytesIO(image_data)
        
        # Open the image using PIL
        image = Image.open(image_bytes)
        
        # Analyze the image
        responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
        
        # Prepare the response data
        data_list = []
        for response in responses:
            data_list.append(response)
        
        # Safe logging of the response
        print('response in route: ', data_list)
        
        return {"message": "Image processed", "data": data_list, "status": "success"}
    
    except Exception as e:
        # Handle the exception and log it
        print(f"Error while processing the image: {e}")
        
        # Return a failed response or error message
        return {"message": "Image processing failed", "status": "error", "error": str(e)}
