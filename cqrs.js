// cqrs eventsource https://www.youtube.com/watch?v=Q0Bz-O67_nI

guid = () => {
  s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

//--------------------------------------------------------
function person(age) {
  this.age = age;
}

let p = new person(18);

p.age = 19;

//-------------------------------------------------------
function person1(age) {
  var age = age;
  this.getAge = function () {
    return age;
  }

  this.setAge = function (value) {
    age = value;
  }

}

let p1 = new person1(18);

p1.setAge(19);
console.log(p1.getAge());

//-------------------------------------------------------


class Log {
  action = '';
  id = null;
  guid = '';
  oldValue = null;
  newValue = null;

  constructor({
    action, id, guid = null, oldValue, newValue
  }) {
    this.action = action;
    this.id =id;
    this.guid = guid;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
}

class EventsService {

  subscribers = {};
  logs = [];

  constructor() {}
  
  subscribe(eventName, id, callback) {
debugger;
    let eventSubscriber = this.subscribers[eventName];

    if(!eventSubscriber) {
      this.subscribers[eventName] = {};
      eventSubscriber = this.subscribers[eventName];
    }

    eventSubscriber[id] = {callback};
  }

  unsubscribe(eventName, id) {
    if (this.subscribers[eventName]) {
      for (let i = 0; i < this.subscribers[eventName].length; i++) {
        if (this.subscribers[eventName][i].id === id) {
          this.subscribers[eventName].splice(i, 1);
          break;
        }
      }
    }
  }
  
  command({eventName, data = null, id = null, ignore = false}) {
    const listeners = this.subscribers[eventName];
    if (!listeners) {
      return;
    }

    if (id) {
      return listeners[id].callback(data, ignore);
    }
    
    Object.values(listeners).forEach(instance => {
      instance.callback(data);
    });
  }

  query({eventName, id = null}) {
    const listeners = this.subscribers[eventName];
    if (!listeners) {
      return;
    }

    if (id) {
      return listeners[id].callback();
    }
    
    const results =[];
    Object.values(listeners).forEach(instance => {
      results.push(instance.callback());
    });
    return results;

    // return Object.values(listeners).reduce((results, instance) => {
    //   const v = instance.callback();
		// 	return results.concat(v);
		// }, []);

  }

  addLog(log) {
    this.logs.push(log);
  }

  undo(steps = 1) {
    const log = this.logs.pop();
    const {action: eventName, oldValue: data, id } = log;
    const undoCommand = {
      eventName,
      data,
      id,
      ignore: true
    };
    
    this.command(undoCommand);
  }

}

class Query {
  constructor(eventName, id, data) {
    this.eventName = eventName;
    this.id = id;
  }
}

class Command {
  constructor(eventName, data, id) {
    this.eventName = eventName;
    this.data = data;
    this.id = id;
  }
}

class Event {

}

class person2 {
  id = guid();
  age = 0;

  constructor(eb) {
    this.eb = eb;
    eb.subscribe("setAge", this.id, (value, ignore) => this.setAge(value, ignore));
    eb.subscribe("getAge", this.id, () => this.getAge());
  }

  getAge() {
    return this.age;
  }

  setAge(value, ignore) {
    if(!ignore) {
    const log = new Log({
      action: 'setAge',
      id: this.id,
      guid: null,
      oldValue: this.age,
      newValue: value
    });
    this.eb.addLog(log);
  }
    
    this.age = value;

  }

}

function parse(s) {
  var re = /(\{)(.*?)(\})/g;
  s = s.replace(re, function(x, $1, $2, $3) {
    return "el." + $2;
  });
  return s;	
 }

 function createFunctionFromString(s) {
   const expression = parse(s);
   const body = `el => ${expression}`;
   return new Function(body);
 }

class collection {
  id = guid();
  name = '';
  list = [];

  constructor(eb, name) {
    this.eb = eb;
    this.name = name;

    eb.subscribe("insert", this.id, (value) => this.insert(value));
    eb.subscribe("remove", this.id, (condition, value) => this.remove(condition, value));
    eb.subscribe("find", this.id, (condition) => this.find(condition));
  }

  insert(value) {
    return this.list.push(value);
  }

  update(condition, value) {
    // const func =createFunctionFromString(condition);
    // this.list = this.list.
    // return this.list.push(value);
  }

  remove(condition, value) {
    const func = createFunctionFromString(condition);
    this.list =  this.list.filter(func);
  }

  find(condition) {
    if(!condition) {
      return this.list;
    }

  }

}

class db {
  id = guid();
  name = '';
  list = [];

  constructor(eb, name) {
    this.eb = eb;
    this.name = name;

    eb.subscribe("insert", this.id, (value) => this.insert(value));
    eb.subscribe("update", this.id, (condition, value) => this.update(condition, value));

    eb.subscribe("remove", this.id, (condition) => this.remove(condition));
    eb.subscribe("find", this.id, (condition) => this.find(condition));
  }

  getCollection(collectionName) {
    let collectionInstance = this.list.find(el => el.name === collectionName );
    if(!collectionInstance) {
      collectionInstance = new collection(this.eb, collectionName); 
      this.list.push(collectionInstance);
    }
    return collectionInstance;
  }

  insert(collectionName, value) {
    const collection = this.getCollection(collectionName);

    const insertCommand = new Command("insert", value, collection.id);
    eb.command(insertCommand);
  }

  update(condition, value) {
    // const func =createFunctionFromString(condition);
    // this.list = this.list.
    // return this.list.push(value);
  }

  remove(collectionName ,condition) {
    const collection = this.getCollection(collectionName);

    const removeCommand = new Command("remove", condition, collection.id);
    
    eb.command(removeCommand);
  }

  find(collectionName ,condition) {
    const collection = this.getCollection(collectionName);

    const findCommand = new Command("find", condition, collection.id);
    
    return eb.command(findCommand);

  }

}

debugger;
const eb = new EventsService();
const p2 = new person2(eb, 2);

const changeAgeCommand = new Command("setAge", 88, p2.id);
eb.command(changeAgeCommand);

console.log(p2);

eb.undo();
console.log(p2);

const p3 = new person2(eb, 3);

const changeAgeForAllCommand = new Command("setAge", 100);
eb.command(changeAgeForAllCommand);

console.log(p2);
console.log(p3);

const agesQuery = new Query("getAge");
const ages = eb.query(agesQuery);
console.log(ages);

const ageQuery = new Query("getAge", p2.id);
const age = eb.query(ageQuery);
console.log(age);

const dbUsers = new db(eb, 'usersDB');
const collectionName = 'users';

dbUsers.insert( collectionName, {
  name: "ion",
  age: 1
});
let users =  dbUsers.find(collectionName);
console.log(users);

// dbUsers.update(collectionName, "{age} < 5", 
// [{
//   age: "{age} +1"
// }]);
// users =  dbUsers.find();
// console.log(users);

dbUsers.remove(collectionName, "{age} < 5");

users =  dbUsers.find();
console.log(users);

// -END event source