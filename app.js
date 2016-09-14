//npm install express ejs
var express = require('express')
var app = express()
// หรือเขียน var app = require('express')() ก็ประกาศแบบนี้ได้เหมือนกัน
var ejs = require('ejs')
var mongo = require('mongodb')
var crypto = require('crypto')

app.listen(3000)

//บรรทัดนี้บอกว่า express เลือกใช้ template engine คือ EJS
app.engine('html', ejs.renderFile)

//การ render ไฟล์ html จะไปหาที่ views เสมอ 
app.get('/', (req, res) => res.render('index.html') )

app.get('/register', function(req, res) {
    res.render('register.html')
    
})

app.post('/register', registerNewUser)

function registerNewUser(req, res) {
    var data = ""
    var sData = []
    req.on('data', chunk => data += chunk )
    req.on('end', () => {
        //decode ตัวอักษรของ uri เป็นตัวอักษรธรรมดา
        data = decodeURIComponent(data)
        //ทับตัว '+' (ที่ควรเป็นเว้นวรรค) ด้วยวรรคช่องว่าง ' '
        data = data.replace(/\+/g, ' ')
        sData = data.split('&')
        
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