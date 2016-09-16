//npm install express ejs
var express = require('express')
var app = express()
// หรือเขียน var app = require('express')() ก็ประกาศแบบนี้ได้เหมือนกัน
var ejs = require('ejs')
var mongo = require('mongodb')
var crypto = require('crypto')
var granted = [ ];

//สั่งให้เป็น Web server ที่ตอบสนองที่ port 3000
app.listen(3000)

//บรรทัดนี้บอกว่า express เลือกใช้ template engine คือ EJS
app.engine('html', ejs.renderFile)

app.use(session)

//การ render ไฟล์ html จะไปหาที่ views เสมอ 
app.get('/', (req, res) => res.render('index.html') )


//-------------- Register ------------------//
app.get('/register', function(req, res) {
    res.render('register.html')
})
app.post('/register', registerNewUser)


//--------------- Login --------------------//
app.get('/login', function(req, res) {
    res.render('login.html')
})

app.post('/login', loginUser)

app.get('/profile', showProfile)

app.get('/new', showNewPost)

app.get('/save', saveNewPost)

app.get('/list', showAll)

app.get('/interest', (req, res) => {
	var result = req.query.balance * 0.0125
	res.send("" + result)
})

app.get('/fixed/:b', (req, res) => {
	var result = req.params.b * 0.0125
	res.send("" + result)
})

var coffee = [ {name: 'Latte', price: 80},
		{name: 'Mocha', price: 90},
		{name: 'Espresso', price: 70} ]
app.get('/budget/:m', (req, res) => {
	data = []
	count = 0
	for(let i = 0; i < coffee.length; i++) {
		if(req.params.m >= coffee[i].price)
		data[count++] = coffee[i]
	}
	res.send(data)
})


// สั่ง Express เป็น Middleware ว่าให้สามารถเข้าถึงแฟ้มนี้ได้
app.use( express.static('public') )








//--------------- Function --------------//
function registerNewUser(req, res) {
    var data = ""
    var sData = []
    req.on('data', chunk => data += chunk )
    req.on('end', () => {

/*
		/////////////// Version 1 //////////////
        //decode ตัวอักษรของ uri เป็นตัวอักษรธรรมดา
        data = decodeURIComponent(data)
        //ทับตัว '+' (ที่ควรเป็นเว้นวรรค) ด้วยวรรคช่องว่าง ' '
        data = data.replace(/\+/g, ' ')
        sData = data.split('&')
*/
		data = decodeURIComponent(data)
		data = data.replace(/\+/g, ' ')
		var sData = data.split('&')

        var info = { }
        for(let i = 0; i < sData.length; i++) {
            var f = sData[i].split('=')
            info[f[0]] = f[1]
            /*
                f[0] -> [ 'name', 'Mark' ] 
                f[1] -> [ 'email', 'mark@email' ]
                f[2] -> [ 'password', 'xxxxxx' ]
            */
        }   

        info.password = crypto.createHmac('sha256', info.password).digest('hex')    
        mongo.MongoClient.connect('mongodb://localhost/Node_Tutorial',
            (error, db) => {
                db.collection('user').find({email: info.email}).toArray(
                    (error, data) => {
                        if(data.length == 0) {
                            db.collection('user').insert(info)
                            res.redirect('/login')
                        } else {
                            res.redirect('/register?message=Duplicated Email')
                        }
                    }
                )
            }
        )
        //console.log(info)
        //res.redirect('/')
    })
}

// mongodb on Windows:
// cd /Users/xxx/Desktop/mongo/bin
// mongod --dbpath . --storageEngine=mmapv1

// mongodb on macOS
// cd /Users/xxx/Dektop/mongo/bin
// ./mongod --dbpath .


//-------------- เซ็ต session-id ------------------//
function session(req, res, next) {
	var cookie = req.headers["cookie"];
	if (cookie == null) {
		cookie = "";
	}
	var data = cookie.split(";");
	for (var i = 0; i < data.length; i++) {
		var field = data[i].split("=");
		if (field[0] == "session") {
			req.session = field[1];
		}
	}
	if (req.session == null) {
		req.session = parseInt(Math.random() * 1000000) + 
				"-" + parseInt(Math.random() * 1000000) + 
				"-" + parseInt(Math.random() * 1000000) + 
				"-" + parseInt(Math.random() * 1000000);
		res.set("Set-Cookie", "session=" + req.session);
	}
	next();
}


function loginUser(req, res) {
	var data = "";
	req.on("data", chunk => data += chunk );
	req.on("end", () => {
		// data -> email=mark@facebook.com&password=mark123
		data = decodeURIComponent(data);
		var a = data.split("&");
		var u = { };
		for (var i = 0; i < a.length; i++) {
			var f = a[i].split("=");
			if (f[0] == "email") {
				u.email = f[1];
			}
			if (f[0] == "password") {
				u.password = f[1];
			}
		}
		u.password = crypto.createHmac('sha256', u.password).digest('hex');
		mongo.MongoClient.connect("mongodb://127.0.0.1/Node_Tutorial", (error, db) => {
			db.collection("user").find(u).toArray((error, data) => {
				if (data.length == 0) {
					res.redirect("/login?message=Invalid Password");
				} else {
					granted[req.session] = data[0];
					res.redirect("/profile");
				}
			});
		});
	});
}

function showProfile(req, res) {
	if (granted[req.session] == null) {
		res.redirect("/login");
	} else {
        var u = granted[req.session]
        var c = ["Latte", "Cappuchino", "Espresso"]
		res.render("profile.html", {user: u, coffee: c});
	}
}


app.use((req, res, next) => {
    res.render('error.html')    
})

function showNewPost(req, res) {
	if(granted[req.session] == null) {
		res.redirect("/login")
	} else {
		res.render("new.html")
	}
}


function saveNewPost(req, res) {
	if(granted[req.session] == null) {
		res.redirect("/login")
	} else {
		var d = { }
		d.topic = req.query.topic
		d.detail = req.query.detail
		d.owner = granted[req.session]._id
		mongo.MongoClient.connect("mongodb://localhost/Node_Tutorial", (error,db) => {
			db.collection('post').insert(d)
		})
		res.redirect("/profile")
	}
}

function showAll(req, res) {
		mongo.MongoClient.connect('mongodb://localhost/Node_Tutorial', (error, db) => {
			db.collection('post').find().toArray( (error, data) => {
					res.render('list.html', {post: data})
				})
		})
}