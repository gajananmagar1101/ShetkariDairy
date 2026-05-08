from pymongo import MongoClient

client = MongoClient("mongodb+srv://gajananmagar004_db_user:OJgp4EnQLg7tsvYa@cluster0.eobdyd7.mongodb.net/dairy_db?appName=Cluster0")
db = client.get_database("dairy_db")
user = db.users.find_one({"email": "sagarmagaar004@gmail.com"})
print(user)
