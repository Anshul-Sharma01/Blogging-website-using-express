const express = require("express");
const app = express();
const fs = require("fs");
const session = require("express-session");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: "SECRET",
        saveUninitialized: false,
        resave: true,
        cookie: {
            maxAge: 60 * 60 * 1000, // Set the session cookie expiry time appropriately
            // Ensure that other cookie options such as domain, path, etc., are correctly set if needed
        },
    })
);


app.use(express.static(__dirname + "/views"));
app.set("view engine", "ejs");

function authentication(req, res, next){
    if (req.session.userAuthenticated) {
        next();
    } else {
        res.redirect("/login");
    }
}


function authorization(req, res, next) {
    if (req.session.userAuthenticated && req.session.userData.role == "admin") {
        next();
    } else {
        res.redirect("/");
    }
}

app.get("/", authentication, (req, res) => {
    const userRole = req.session.userData.role;
    const uname = req.session.userData.username;
    if(userRole === "admin"){
        fs.readFile("./blogs.json","utf-8",(err,data) => {
            data = JSON.parse(data);
            // console.log(data);
            res.render("home",{
                role:userRole,
                blogsData : data
            })
        })
    }else{
        fs.readFile("./blogs.json","utf-8",(err,data) => {
            data = JSON.parse(data);
            data.forEach((ele) => {
                if(ele.username === uname){
                    res.render("home",{
                        role:userRole,
                        blogsData : ele.blogs
                    })
                }
            })
        })
    }
    // res.render("home",{message:`Welcome ${req.session.userData.username}, Your role is of ${userRole}`});
});

app.get("/createpost",authentication,(req,res) => {
    res.render("createPost",{message:"Ky haal hain !!"});
})

app.post("/createpost",(req,res) => {
    const { title, content } = req.body;
    const userRole = req.session.userData.role;
    const uname = req.session.userData.username;
    fs.readFile("./blogs.json","utf-8",(err,data) => {
        data = JSON.parse(data);
        data.forEach((ele) => {
            const blog_id = ele.TotalBlogs;
            if(ele.username === uname){
                ele.blogs.push({
                    blogId : blog_id + 1,
                    title,
                    content 
                })
                console.log("Added success");
                ele.TotalBlogs += 1; 
            }
        })
        fs.writeFile("./blogs.json",JSON.stringify(data, null, 2), (err) => {
            if(err){
                console.error("Error writing to file : ",err);
                return;
            }
            console.log("File Updated Successfully");
        })
        res.redirect("/");
    })
})

app.get("/updatepost/:postId",authentication,(req,res) => {
    const  uname  = req.session.userData.username;
    const postId = req.params.postId;
    let blog = {};
    fs.readFile("./blogs.json","utf-8",(err,data) => {
        data = JSON.parse(data);
        data.forEach((ele) => {
            if(ele.username === uname){
                ele.blogs.forEach((el) => {
                    if(el.blogId == postId){
                        blog = {
                            title:el.title,
                            content:el.content,
                            postId : postId
                        }
                    }
                })
            }
        })

        res.render("updatepost",blog);
    })
})

app.post("/updatepost/:postId", (req, res) => {
    const { title, content } = req.body;
    const uname = req.session.userData.username;
    const postId = req.params.postId;

    fs.readFile("./blogs.json", "utf-8", (err, data) => {
        if (err) {
            console.error("Error reading file: ", err);
            return res.status(500).send("Internal Server Error");
        }

        data = JSON.parse(data);
        let updated = false;

        // Iterate through the data to find the user's blogs and update the appropriate post
        data.forEach((ele) => {
            if (ele.username === uname) {
                ele.blogs.forEach((el) => {
                    if (el.blogId.toString() === postId) {
                        el.title = title;
                        el.content = content;
                        updated = true;
                    }
                });
            }
        });

        if (updated) {
            // Write updated data back to blogs.json
            fs.writeFile("./blogs.json", JSON.stringify(data, null, 2), (err) => {
                if (err) {
                    console.error("Error writing to file:", err);
                    return res.status(500).send("Internal Server Error");
                }
                console.log("Post Updated Successfully");
                res.redirect("/");
            });
        } else {
            console.error("Post not found for update");
            res.status(404).send("Post not found");
        }
    });
});



app.get("/login", (req, res) => {
    res.render("login", { message: "!! Login !!" });
});

app.post("/deletepost/:username/:blogId", authentication, (req, res) => {
    const username = req.params.username;
    const blogId = req.params.blogId;

    fs.readFile("./blogs.json", "utf-8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).send("Internal Server Error");
        }

        let blogsData = JSON.parse(data);
        let userIndex = blogsData.findIndex((user) => user.username === username);

        if (userIndex !== -1) {
            let blogIndex = blogsData[userIndex].blogs.findIndex((blog) => blog.blogId.toString() === blogId);
            if (blogIndex !== -1) {
                // Remove the blog post from the array
                blogsData[userIndex].blogs.splice(blogIndex, 1);

                // Update the blogs.json file
                fs.writeFile("./blogs.json", JSON.stringify(blogsData, null, 2), (err) => {
                    if (err) {
                        console.error("Error writing to file:", err);
                        return res.status(500).send("Internal Server Error");
                    }
                    console.log("Post deleted successfully");
                    return res.redirect("/");
                });
            } else {
                console.error("Blog post not found");
                return res.status(404).send("Blog post not found");
            }
        } else {
            console.error("User not found");
            return res.status(404).send("User not found");
        }
    });
});



app.post("/login", (req, res) => {
    const { username, pass } = req.body;

    fs.readFile("./user.json", "utf-8", (err, data) => {
        if (err) {
            return res.send("ERROR : ", err);
        }

        data = JSON.parse(data);
        let result = data.find((user) => user.username === username && user.pass === pass);

        if (!result) {
            console.log("Invalid Credentials");
            return res.render("login", { message: "Invalid Credentials" });
        }

        req.session.userAuthenticated = true;
        req.session.userData = result;
        return res.redirect("/");
    });
});


app.get("/logout", (req, res) => {
    console.log(req.session.cookie);
    req.session.destroy();
    res.render("login", { message: "Successfully Logged out" });
});

app.listen(8000, () => {
    console.log("Server is listening at http://localhost:8000");
});
