import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name="dwfelau7t",
    api_key="628464165927228",
    api_secret="JpMktquuw57KraOvCsSaci72cQs"
)

response = cloudinary.uploader.upload("C:\\Users\\Dell\\Desktop\\crime\\crime 6.jpg")
print("Image URL:", response["secure_url"])
