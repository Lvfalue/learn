var socketio = require('socket.io');
var io;
var guestNum = 1;
var nickName = {};
var nameUsed = [];
var currentRoom = {};

exports.listen = function (server) {
  io = socketio.listen(server);

  io.sockets.on('connection', function (socket) {
    console.log('connection')
    guestNum = assignGuestName(socket, guestNum, nickName, nameUsed);

    joinRoom(socket, 'Lobby');

    handleMessageBroadcasting(socket, nickName);
    handleNameChangeAttemps(socket, nickName, nameUsed);
    handleRoomJoining(socket);

    socket.on('room', function () {
      socket.emit('room', io.sockets.manager.rooms);
    })

    handleCientDisconnection(socket, nickName, nameUsed);
  })
}

function assignGuestName(socket, guestNum, nickName, nameUsed) {
  var name = 'Guest' + guestNum;
  nickName[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  })

  nameUsed.push(name);
  return guestNum + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {
    success: true,
    room: room
  })
  socket.broadcast.to(room).emit('message', {
    text: nickName[socket.id] + ' has joined ' + room + '.' 
  })
  console.log('nickname', nickName)

  var prefix = socket.id.indexOf('/#') > -1 ? '/#' : '';

  var usersInRoom = io.sockets.clients().server.eio.clients;
  // console.log('usersInRoom', usersInRoom)
  // if(usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ':';
    for(var index in usersInRoom) {
      console.log(index, usersInRoom[index].id, socket.id)
      var userSocketId = prefix + usersInRoom[index].id;
      if(userSocketId != socket.id) {
        if(index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickName[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {
      text: usersInRoomSummary
    })
  // }
}


function handleNameChangeAttemps(socket, nickName, nameUsed) {
  socket.on('nameAttempt', function(name) {
    if(name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'names cannot begin with Guest.'
      })
    } else {
      if(nameUsed.indexOf(name) == -1) {
        var previousName = nickName[socket.id];
        var previousNameIndex = nameUsed.indexOf(previousName);
        nameUsed.push(name);
        nickName[socket.id] = name;
        delete nameUsed[previousNameIndex];

        socket.emit('nameResult', {
          success: true,
          name: name
        });

        socket.broadcast.to(currentRoom[socket.id])
          .emit('message', {
            text: previousName + ' is now known as ' + name + '.'
          })
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'that name is already in use.'
        })
      }
    }
  })
}

function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickName[socket.id] + ': ' + message.text
    })
  })
}

function handleRoomJoining(socket) {
  socket.on('join', function (room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleCientDisconnection(socket) {
  socket.on('disconnect', function () {
    var nameIndex = nameUsed.indexOf(nickName[socket.id]);
    delete nameUsed[nameIndex];
    delete nickName[socket.id];
  })
}

  