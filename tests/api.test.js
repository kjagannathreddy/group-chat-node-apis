const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');  

const expect = chai.expect;
chai.use(chaiHttp);

describe('API Tests', () => {
  let authToken;  
  let userIdToUpdate; 
  let groupId;    

  before(async () => {
    const response = await chai.request(app)
      .post('/login')
      .send({ username: 'superadmin', password: '123456' });  // Replace with valid credentials
    authToken = response.body.token;

    const createUserResponse = await chai.request(app)
      .post('/admin/createUser')
      .set('Authorization', `${authToken}`)
      .send({ username: 'usertoUpdate', password: 'password123', isAdmin: false });

    userIdToUpdate = createUserResponse.body.user._id;

    const createGroupResponse = await chai.request(app)
      .post('/groups/createGroup')
      .set('Authorization', `${authToken}`)
      .send({ groupName: 'Test Group' });

    groupId = createGroupResponse.body.group._id;
  });

  describe('Authentication APIs', () => {
    it('should successfully log in a user', async () => {
      const response = await chai.request(app)
        .post('/login')
        .send({ username: 'newuser', password: '123456' });

      expect(response).to.have.status(200);
      expect(response.body).to.have.property('token');
    });

    it('should return 401 for invalid login credentials', async () => {
      const response = await chai.request(app)
        .post('/login')
        .send({ username: 'invaliduser', password: 'invalidpassword' });

      expect(response).to.have.status(401);
      expect(response.body).to.have.property('message', 'Invalid credentials');
    });
  });

  describe('Admin APIs', () => {
    it('should create a new user by admin', async () => {
      const response = await chai.request(app)
        .post('/admin/createUser')
        .set('Authorization', `${authToken}`)
        .send({ username: 'newuser123', password: 'newpassword', isAdmin: true });

      expect(response).to.have.status(201);
      expect(response.body).to.have.property('message', 'User created successfully');
      expect(response.body.user).to.have.property('username', 'newuser123');
    });

    it('should edit an existing user by admin', async () => {
      const response = await chai.request(app)
        .put(`/admin/editUser/${userIdToUpdate}`)
        .set('Authorization', `${authToken}`)
        .send({ username: 'updatedUser', password: 'newpassword123', isAdmin: true });

      expect(response).to.have.status(200);
      expect(response.body).to.have.property('message', 'User updated successfully');
      expect(response.body.user).to.have.property('username', 'updatedUser');
      expect(response.body.user).to.have.property('isAdmin', true);
    });

  });

  describe('Groups APIs', () => {
    it('should create a new group', async () => {
      const response = await chai.request(app)
        .post('/groups/createGroup')
        .set('Authorization', `${authToken}`)
        .send({ groupName: 'New Group' });

      expect(response).to.have.status(201);
      expect(response.body).to.have.property('message', 'Group created successfully');
      expect(response.body.group).to.have.property('name', 'New Group');
    });

    it('should return 400 for creating a group without a name', async () => {
      const response = await chai.request(app)
        .post('/groups/createGroup')
        .set('Authorization', `${authToken}`)
        .send({});

      expect(response).to.have.status(400);
      expect(response.body).to.have.property('message', 'Group name is required');
    });

    it('should search for groups', async () => {
      const response = await chai.request(app)
        .get('/groups/searchGroup/Test')
        .set('Authorization', `${authToken}`);

      expect(response).to.have.status(200);
      expect(response.body).to.have.property('groups').to.be.an('array');
    });

  });

  describe('Group Messages APIs', () => {
    let authToken;
  let groupId;

  before(async () => {
    const response = await chai.request(app)
      .post('/login')
      .send({ username: 'newuser', password: '123456' });
    authToken = response.body.token;

    const createGroupResponse = await chai.request(app)
      .post('/groups/createGroup')
      .set('Authorization', `${authToken}`)
      .send({ groupName: 'Test new user Group' });
    groupId = createGroupResponse.body.group._id;
  });

  it('should send a message in a group', async () => {
    const response = await chai.request(app)
      .post(`/groups/sendMessage/${groupId}`)
      .set('Authorization', `${authToken}`)
      .send({ message: 'Hello, Group!' });

    expect(response).to.have.status(200);
    expect(response.body).to.have.property('message', 'Message sent successfully');
    expect(response.body).to.have.property('group');
    expect(response.body).to.have.property('sentBy', 'newuser');
    expect(response.body).to.have.property('content', 'Hello, Group!');
  });

  });
});
