const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const User = require('../models/User')
const Faculty = require('../models/Faculty')
const Topic = require('../models/Topic')
const Article = require('../models/Article')
const RequestLog = require('../analytics_service')
const { Logout } = require('../Login')
const Room = require('../models/Room')
const Profile = require('../models/Profile')

//view statistical data
router.get('/', isAdmin, async (req, res) => {
    const user = await User.findById(req.session.userId)
    const analytics = await RequestLog.getAnalytics()
    const countTotalArticle = await Article.find().estimatedDocumentCount()
    const countTotalTopic = await Topic.find().estimatedDocumentCount()
    const countTotalFaculty = await Faculty.find().estimatedDocumentCount()
    const countTotalAccount = await User.find().estimatedDocumentCount()
    const countTotalStudent = await User.find({ role: 'student' }).countDocuments()
    const countTotalCoordinator = await User.find({ role: 'coordinator' }).countDocuments()
    const countTotalAdmin = await User.find({ role: 'admin' }).countDocuments()
    const countTotalManager = await User.find({ role: 'manager' }).countDocuments()
    const array = analytics.requestsPerDay
    let d = new Date()
    let day = array[d.getDay()]
    res.render('admin/index', {
        user: user,
        countTotalFaculty: countTotalFaculty,
        countTotalTopic: countTotalTopic,
        countTotalArticle: countTotalArticle,
        totalRequests: analytics.totalRequests,
        day: analytics.requestsPerDay[0]._id,
        requestsInDay: analytics.requestsPerDay[0].numberOfRequests,
        totalAccount: countTotalAccount,
        totalStudent: countTotalStudent,
        totalCoordinator: countTotalCoordinator,
        totalManager: countTotalManager,
        totalAdmin: countTotalAdmin
    })
})

//Message
router.get('/message', isAdmin, async (req, res) => {
    const rooms = await Room.find({ status: 'unread' }).populate('sender').exec()
    res.render('admin/message', {
        rooms: rooms
    })
})

router.get('/message/read', isAdmin, async (req, res) => {
    const rooms = await Room.find({ status: 'read' }).populate(['sender', 'receiver']).exec()
    return res.render('admin/readMessage', {
        rooms: rooms
    })
})

router.get('/message/read/:id', isAdmin, async (req, res) => {
    const room = await Room.findById(req.params.id).populate(['sender', 'receiver']).exec()
    res.render('admin/showReadMessage', {
        room: room
    })
})

router.get('/message/unread', isAdmin, async (req, res) => {
    const rooms = await Room.find({ status: 'unread' }).populate('sender').exec()
    return res.render('admin/message', {
        rooms: rooms
    })
})

router.get('/message/:id', isAdmin, async (req, res) => {
    const room = await Room.findById(req.params.id).populate('sender').exec()
    res.render('admin/showMessage', {
        room: room
    })
})

router.post('/message/:id', isAdmin, async (req, res) => {
    const room = await Room.findById(req.params.id)
    const receiver = await User.findById(req.session.userId)
    const isDone = req.body.status
    if (isDone === 'done') {
        room.receiver = receiver.id
        room.status = 'read'
        room.receivedAt = Date.now()
        await room.save()
        req.flash('errorMessage', 'Action is done successfully ')
        return res.redirect('/admin/message')
    }
})

//User function

router.get('/user', async (req, res) => {
    let query = User.find()
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/admin', async (req, res) => {
    let query = User.find({ role: 'admin' })
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/manager', async (req, res) => {
    let query = User.find({ role: 'manager' })
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/coordinator', async (req, res) => {
    let query = User.find({ role: 'coordinator' })
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/student', async (req, res) => {
    let query = User.find({ role: 'student' })
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/guest', async (req, res) => {
    let query = User.find({ role: 'guest' })
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const user = await query.populate('faculty').exec()
        res.render('admin/user', {
            user: user,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }
})

router.get('/user/new', isAdmin, async (req, res) => {
    const faculty = await Faculty.find({})
    res.render('admin/register', {
        faculty: faculty
    })
})

router.post('/user/new', isAdmin, async (req, res) => {
    const ExistedUser = await User.findOne({ username: req.body.username })
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const role = req.body.role
    let faculty
    if (role === 'coordinator' || role === 'student' || role === 'guest') {
        faculty = req.body.faculty
    } else {
        faculty = null
    }

    try {
        const newUser = new User({
            name: req.body.name,
            username: req.body.username,
            password: hashedPassword,
            role: req.body.role,
            faculty: faculty
        })
        if (!ExistedUser) {
            await newUser.save()

            const newProfile = new Profile({
                fullName: req.body.name,
                user: newUser.id
            })
            await newProfile.save()

            res.redirect('/admin/user')
        } else {
            req.flash('errorMessage', 'Username already used')
            req.redirect('back')
        }
    } catch (err) {
        console.log(err)
        res.redirect('/admin/user/new')
    }
})

router.get('/user/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("faculty").exec()
        console.log(user)
        res.render('admin/showUser', {
            user: user
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin/user')
    }
})

router.get('/user/:id/edit', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.find({})
        const user = await User.findById(req.params.id)
        const params = {
            user: user,
            faculty: faculty
        }
        res.render('admin/editUser', params)
    } catch (err) {
        console.log(err)
        res.redirect(`/admin/user/${user._id}`)
    }
})

router.put('/user/:id/edit', isAdmin, async (req, res) => {
    try {
        const newRole = req.body.role;
        let newFaculty = req.body.faculty

        if (newRole === 'coordinator' || newRole === 'student' || newRole === 'guest') {
            newFaculty = req.body.faculty
        } else {
            newFaculty = null
        }


        const user = await User.findById(req.params.id)
        if (newRole) {
            user.role = newRole;
        }
        user.faculty = newFaculty;
        await user.save()
        return res.redirect(`/admin/user/${user._id}`)
    } catch (err) {
        console.log(err)
        if (faculty != null) {
            req.flash('errorMessage', 'Cannot edit this faculty')
            res.redirect('back')
        } else {
            res.redirect('/admin/user/' + req.params.id)
        }
    }
})

router.delete('/user/:id', isAdmin, async (req, res) => {
    let user
    let profile
    try {
        if (req.params.id === req.session.userId) {
            req.flash('errorMessage', 'You can not delete yourself')
            res.redirect('back')
        } else {
            user = await User.findById(req.params.id)
            user.remove()
            // profile = await Profile.findOne({ user: user.id })
            // await profile.remove()
        }
        res.redirect('/admin/user')
    } catch (err) {
        console.log(err)
        if (user != null) {
            req.flash('errorMessage', 'Could not delete the user')
            res.redirect('back')
        } else {
            res.redirect(`/user/${user._id}`)
        }
    }
})

/**
 * FACULTY FUNCTION
*/

router.get('/faculty', isAdmin, async (req, res) => {
    let query = Faculty.find()
    if (req.query.name != null && req.query.name != '') {
        query = query.regex('name', new RegExp(req.query.name, 'i'))
    }
    try {
        const faculty = await query.exec()
        res.render('admin/faculty', {
            faculty: faculty,
            searchOptions: req.query
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin')
    }

})

router.get('/faculty/new', isAdmin, (req, res) => {
    res.render('admin/newFaculty')
})

router.post('/faculty/new', async (req, res) => {
    try {
        const existedFaculty = await Faculty.findOne({ name: req.body.name })
        const newFaculty = new Faculty({
            name: req.body.name,
            description: req.body.description
        })
        if (existedFaculty == null) {
            await newFaculty.save()
            res.redirect('/admin/faculty')
        } else {
            req.flash('errorMessage', 'Faculty Existed')
            res.redirect('back')
        }
    } catch (err) {
        console.log(err)
        res.redirect('/admin/faculty')
    }
})

router.get('/faculty/:id', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id)
        console.log(faculty)
        const topic = await Topic.find({ faculty: faculty._id })
        console.log(topic)
        res.render('admin/showFaculty', {
            faculty: faculty,
            topic: topic
        })
    } catch (err) {
        console.log(err)
        res.redirect('/admin/faculty')
    }
})

router.get('/faculty/:id/edit', isAdmin, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id)
        const params = {
            faculty: faculty
        }
        res.render('admin/editFaculty', params)
    } catch (err) {
        console.log(err)
        res.redirect(`/admin/faculty/${faculty._id}`)
    }
})

router.put('/faculty/:id/edit', isAdmin, async (req, res) => {
    let faculty
    try {
        faculty = await Faculty.findById(req.params.id)
        faculty.name = req.body.name
        faculty.description = req.body.description
        await faculty.save()
        res.redirect(`/admin/faculty/${faculty._id}`)
    } catch (err) {
        console.log(err)
        if (faculty != null) {
            req.flash('errorMessage', 'Cannot edit this faculty')
            res.redirect('back')
        } else {
            res.redirect(`/admin/faculty/${faculty._id}`)
        }
    }
})

router.delete('/faculty/:id', isAdmin, async (req, res) => {
    let faculty
    try {
        faculty = await Faculty.findById(req.params.id)
        await faculty.remove()
        res.redirect('/admin/faculty')
    } catch {
        if (faculty != null) {
            req.flash('errorMessage', 'Could not delete the faculty')
            res.redirect('back')
        } else {
            res.redirect(`/faculty/${faculty._id}`)
        }
    }
})

//show Topic
router.get('/topic/:id', async (req, res) => {
    const topic = await Topic.findById(req.params.id)
    const articles = await Article.find({ topic: topic.id })
    res.render('admin/showTopic', {
        topic: topic,
        articles: articles
    })
})

router.get('/topic/:id/assigndate', isAdmin, async (req, res) => {
    const topic = await Topic.findById(req.params.id)
    res.render('admin/editdate', {
        topic: topic
    })
})

router.put('/topic/:id/assigndate', isAdmin, async (req, res) => {
    try {
        const newED = req.body.expiredDate
        const newFED = req.body.finalExpiredDate

        let topic = await Topic.findById(req.params.id)
        if (newED) {
            topic.expiredDate = newED
        }
        if (newFED) {
            topic.finalExpiredDate = newFED
        }
        await topic.save()
        req.flash('errorMessage', 'Update successfully')
        res.redirect(`/admin/topic/${topic._id}`)
    } catch (e) {
        console.log(e)
        req.flash('errorMessage', 'Can not update this topic')
        res.redirect('back')
    }


})

function isAdmin(req, res, next) {
    console.log(req.session)
    if (req.session.isAdmin === true) { next() }
    else if (req.session.isManager === true) { return res.redirect('/manager') }
    else if (req.session.isCoordinator === true) { return res.redirect('/coordinator') }
    else if (req.session.isUser === true) { return res.redirect('/user') }
    else { res.redirect('/') }
}

router.get('/logout', Logout)

module.exports = router
