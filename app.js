const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/user');
const Group = require('./models/group');
const Message = require('./models/message');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());

// Connect to MongoDB (adjust the URL to your MongoDB instance)
mongoose.connect('mongodb://localhost:27017/chat_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware to check user roles
function checkUserRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.isAdmin ? 'admin' : 'user')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
}

// Authentication middleware
function authenticateUser(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Admin APIs
app.post('/admin/createUser', authenticateUser, checkUserRole(['admin']), async (req, res) => {
  const { username, password, isAdmin } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, isAdmin });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/admin/editUser/:userId', authenticateUser, checkUserRole(['admin']), async (req, res) => {
  const { username, password, isAdmin } = req.body;
  const userId = req.params.userId;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the new username is already taken
    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    user.username = username;
    user.password = await bcrypt.hash(password, 10);
    user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;

    await user.save();

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Authentication APIs
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    console.log('User:', user);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin } }, SECRET_KEY);
    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/logout', authenticateUser, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Groups APIs
app.post('/groups/createGroup', authenticateUser, checkUserRole(['admin', 'user']), async (req, res) => {
  const { groupName } = req.body;

  try {
    // Validate input
    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Check if group name is already taken
    const existingGroup = await Group.findOne({ name: groupName });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group name is already taken' });
    }

    const newGroup = new Group({ name: groupName, members: [req.user.id] });
    await newGroup.save();

    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/groups/deleteGroup/:groupId', authenticateUser, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only allow group deletion by the group creator (first member)
    if (group.members[0] !== req.user.id) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await group.remove();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/groups/searchGroup/:groupName', authenticateUser, async (req, res) => {
  const groupName = req.params.groupName.toLowerCase();

  try {
    const matchingGroups = await Group.find({ name: { $regex: groupName, $options: 'i' } });
    res.json({ groups: matchingGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/groups/addMembers/:groupId', authenticateUser, async (req, res) => {
  const groupId = req.params.groupId;
  const { userIds } = req.body;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only allow group members to add other members
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Add new members to the group
    group.members = [...new Set([...group.members, ...userIds])];
    await group.save();

    res.json({ message: 'Members added successfully', group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Group Messages APIs
app.post('/groups/sendMessage/:groupId', authenticateUser, async (req, res) => {
  const groupId = req.params.groupId;
  const { message } = req.body;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only allow group members to send messages
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const newMessage = new Message({
      content: message,
      sender: req.user.id,
      group: groupId,
    });

    await newMessage.save();

    group.messages.push(newMessage);
    await group.save();

    res.json({ message: 'Message sent successfully',
      group: {
        _id: group._id,
        name: group.name,
        members: group.members,
        messages: group.messages,
      },
      sentBy: req.user.username,
      content: message, });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/groups/likeMessage/:groupId/:messageId', authenticateUser, async (req, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  let responseMessage ='';

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const message = group.messages.id(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the user has already liked the message
    const userLiked = message.likes.includes(req.user.id);

    if (userLiked) {
      // If the user already liked the message, unlike it
      message.likes.pull(req.user.id);
      responseMessage = "Message unliked";
    } else {
      // If the user hasn't liked the message, add a like
      message.likes.push(req.user.id);
      responseMessage = "Message liked";
    }

    await group.save();

    res.json({ message: responseMessage, group, messageId, likedBy: message.likes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
