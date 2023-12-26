run npm install
configure mongodb details
create a document manually in database users collection. sample details
    
      username: "superadmin"
      password: "$2b$10$DeA8rln3f.0i8A67Z2DEruJVX9dll7TkCaG7yCpCM7ii94VIEVCeq"
      isAdmin: true
password is hashed and value is 123456

use this credentials in other apis 

start the server
npm start

to run test cases
npm run test

apis
http://localhost:3000/login
post
{
  "username": "superadmin",
  "password": "123456"
}

http://localhost:3000/admin/createUser
headers
Authorization:token_from_login_api
e.g- Authorization:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjU4NDU5NWIwMmViZTc5ZGVhNzA2ZjkwIiwidXNlcm5hbWUiOiJzdXBlcmFkbWluIiwiaXNBZG1pbiI6dHJ1ZX0sImlhdCI6MTcwMzU3MzQxMX0.mlC2uQ0xK1VVWGZBJtotqMPqtTbZSRvtVege6YCa7T0
post
{
    "username": "someuser",
    "password": "123456",
    "isAdmin": false
}

headers required in all apis

http://localhost:3000/admin/editUser/6586f1203c330573e4698104
put
{
    "username": "newuser",
    "password": "123456",
    "isAdmin": true
}

http://localhost:3000/groups/createGroup
post
{
    "groupName": "helloworld"
}

http://localhost:3000/groups/addMembers/65892abda236b5afd26837cb
post
{
    "userIds": ["65892abda236b5afd26837cb"]
}

http://localhost:3000/groups/sendMessage/65892abda236b5afd26837cb
post
{
    "message": "hello everyone."
}

http://localhost:3000/groups/likeMessage/65892abda236b5afd26837cb/658933da43650a3a0177b3bd
post
