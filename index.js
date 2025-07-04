const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middlewares
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mfxvb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // database collection
    const instantRBlogs = client
      .db("instantr07")
      .collection("instant-r-all-blogs");
    const instantRVideos = client
      .db("instantr07")
      .collection("instant-r-videos");
    const instantRUsers = client.db("instantr07").collection("users");
    const pendingApproval = client
      .db("instantr07")
      .collection("pending-approval");
    const approvalHistory = client
      .db("instantr07")
      .collection("approval-history");

    const adminApprovalHistory = client
      .db("instantr07")
      .collection("approval-history-for-admin");

    // GET OPERATIONS
    // get operation for first section card
    app.get("/home", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ createdAt: -1 }).limit(1);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for well home first section card
    app.get("/well/home", async (req, res) => {
      const categories = ["Health", "Life", "Food", "Mind"];

      const cursor = instantRBlogs
        .find({ blog_category: { $in: categories } })
        .sort({ createdAt: -1 })
        .limit(1);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for blogs
    // Get operation for blogs with pagination
    app.get("/section/blogs", async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 45;

      const totalCount = await instantRBlogs.countDocuments(); // Total number of blogs
      const cursor = instantRBlogs
        .find()
        .sort({ createdAt: -1 })
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();
      res.send({ blogData: result, totalCount });
    });

    // get operation for home with limit
    app.get("/featured-blogs", async (req, res) => {
      const cursor = instantRBlogs
        .find()
        .sort({ createdAt: -1 })
        .skip(5)
        .limit(11);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for details page
    app.get("/blog-details/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const selectedBlogForDetails = await instantRBlogs.findOne({
          _id: new ObjectId(id),
        });

        if (!selectedBlogForDetails) {
          return res.status(404).send("Blog details data not found");
        }

        // find latest blog in the same category
        const relatedBlogs = await instantRBlogs
          .find({
            blog_category: {
              $regex: `^${selectedBlogForDetails.blog_category}$`,
              $options: "i",
            },
            _id: { $ne: new ObjectId(id) },
          })
          .sort({ createdAt: -1 })
          .limit(8)
          .toArray();

        // find most popular blog for same category.
        const popularBlogs = await instantRBlogs
          .find({
            blog_category: {
              $regex: `^${selectedBlogForDetails.blog_category}$`,
              $options: "i",
            },
            _id: { $ne: new ObjectId(id) },
          })
          .sort({ blog_viewCount: -1 })
          .limit(8)
          .toArray();

        const result = {
          selectedBlogForDetails,
          relatedBlogs,
          popularBlogs,
        };

        res.send(result);
      } catch (error) {
        console.error("ERROR WHILE FETCHING BLOG:", error);
        res.status(500).send("server error");
      }
    });

    // get operation for category wise blogs routes
    // Get operation for category-wise blogs routes with pagination
    app.get("/section/:category", async (req, res) => {
      const { category } = req.params;
      const page = parseInt(req.query.page) || 0; // Default to page 0
      const size = parseInt(req.query.size) || 45; // Default to 50 items per page

      if (!category) {
        return res.status(404).send("Category not found");
      }

      const query = {
        blog_category: {
          $regex: `^${category}$`,
          $options: "i",
        },
      };

      const totalCount = await instantRBlogs.countDocuments(query); // Count total matching documents
      const cursor = instantRBlogs
        .find(query)
        .sort({ createdAt: -1 })
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();

      res.send({ blogData: result, totalCount });
    });

    // get operation for category wise blogs for home route and showing blogs cards by 4.
    app.get("/home-category-sections", async (req, res) => {
      try {
        const categories = await instantRBlogs
          .aggregate([{ $group: { _id: "$blog_category" } }])
          .toArray();

        const blogsByCategory = {};

        for (const categoryObj of categories) {
          const category = categoryObj._id;
          const blogs = await instantRBlogs
            .find({ blog_category: category })
            .sort({ createdAt: -1 })
            .limit(4)
            .toArray();

          blogsByCategory[category] = blogs;
        }

        res.status(200).send(blogsByCategory);
      } catch (err) {
        console.error("Error:", err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // get operation for well home category section
    app.get("/well/home-category-sections", async (req, res) => {
      try {
        // Define the categories you want
        const desiredCategories = ["Life", "Mind", "Food", "Health"];

        // Filter for desired categories
        const categories = await instantRBlogs
          .aggregate([
            { $match: { blog_category: { $in: desiredCategories } } }, // Filter by desired categories
            { $group: { _id: "$blog_category" } },
          ])
          .toArray();

        const blogsByCategory = {};

        for (const categoryObj of categories) {
          const category = categoryObj._id;
          const blogs = await instantRBlogs
            .find({ blog_category: category })
            .sort({ createdAt: -1 })
            .limit(4)
            .toArray();

          blogsByCategory[category] = blogs;
        }

        res.status(200).send(blogsByCategory);
      } catch (err) {
        console.error("Error:", err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // get operation for latest blog
    app.get("/latest-blogs", async (req, res) => {
      const cursor = instantRBlogs
        .find()
        .sort({ createdAt: -1 })
        .skip(1)
        .limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for latest blog in search
    app.get("/latest-blogs-in-search", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ createdAt: -1 }).limit(12);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for newsletter section in home route.
    app.get("/newsletters", async (req, res) => {
      const query = {
        blog_category: {
          $regex: `^${`newsletters`}$`,
          $options: "i",
        },
      };
      const cursor = instantRBlogs.find(query).sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for popular blogs sections
    app.get("/most-popular", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ blog_viewCount: -1 }).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for popular blogs sections
    app.get("/most-popular-for-dashboard", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ blog_viewCount: -1 }).limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for popular blogs sections
    app.get("/most-popular-for-details-page", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ blog_viewCount: -1 }).limit(8);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for search route
    // Search Route
    app.get("/search", async (req, res) => {
      const query = req.query.query;

      if (!query) {
        return res.status(400).send("Query parameter is required");
      }

      try {
        const results = await instantRBlogs
          .find({
            $or: [
              { blog_title: { $regex: query, $options: "i" } },
              { blog_category: { $regex: query, $options: "i" } },
              { blog_subheading: { $regex: query, $options: "i" } },
            ],
          })
          .sort({ createdAt: -1 })
          .toArray();

        // Send the results in the response
        res.json(results);
      } catch (error) {
        console.error("Error fetching search results:", error);
        res.status(500).send("Error fetching search results");
      }
    });

    // get operations for all video route
    app.get("/videos", async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 35;

      const totalCount = await instantRVideos.countDocuments(); // Total number of videos
      const cursor = instantRVideos
        .find()
        .sort({ createdAt: -1 })
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();

      res.send({ videos: result, totalCount });
    });

    // get operations for home video section
    app.get("/video-section", async (req, res) => {
      const cursor = instantRVideos.find().sort({ createdAt: -1 }).limit(10);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for all blogs data in dashboard
    app.get("/all-blog-Data", async (req, res) => {
      const cursor = instantRBlogs.find().sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for user role
    app.get("/user-role", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const cursor = instantRUsers.find(query);

      try {
        const result = await cursor.toArray(); // Wait until the data is fetched

        if (result && result.length > 0) {
          res.send(result[0].role);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user role: ", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // get operation for users
    app.get("/users", async (req, res) => {
      const cursor = instantRUsers.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for my posted blogs by email query
    app.get("/my-posted-blogs", async (req, res) => {
      const email = req.query.email;
      const page = parseInt(req.query.page) || 1; // Current page
      const limit = parseInt(req.query.limit) || 5; // Blogs per page
      const skip = (page - 1) * limit;

      const filter = { userEmail: email };
      try {
        const totalBlogs = await instantRBlogs.countDocuments(filter); // Total blogs count
        const blogs = await instantRBlogs
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalPages = Math.ceil(totalBlogs / limit);

        res.send({ blogs, totalPages });
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // get operation for my posted videos by email query
    app.get("/my-posted-videos", async (req, res) => {
      const email = req.query.email;
      const page = parseInt(req.query.page) || 1; // Current page
      const limit = parseInt(req.query.limit) || 5; // Blogs per page
      const skip = (page - 1) * limit;

      const filter = { userEmail: email };
      try {
        const totalBlogs = await instantRVideos.countDocuments(filter); // Total blogs count
        const blogs = await instantRVideos
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalPages = Math.ceil(totalBlogs / limit);

        res.send({ blogs, totalPages });
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // get operation for others posts
    app.get("/others-posted-blogs", async (req, res) => {
      const email = req.query.email; // Requested email
      const page = parseInt(req.query.page) || 1; // Current page
      const limit = parseInt(req.query.limit) || 5; // Blogs per page
      const skip = (page - 1) * limit;

      // Filter to exclude the requested email
      const filter = { userEmail: { $ne: email } };

      try {
        const totalBlogs = await instantRBlogs.countDocuments(filter); // Count blogs excluding the requested email
        const blogs = await instantRBlogs
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalPages = Math.ceil(totalBlogs / limit);

        res.send({ blogs, totalPages });
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // get operation for approval req
    app.get("/approval-req", async (req, res) => {
      const email = req.query.email; // Requested email
      const page = parseInt(req.query.page) || 1; // Current page
      const limit = parseInt(req.query.limit) || 5; // Blogs per page
      const skip = (page - 1) * limit;

      // Filter to exclude the requested email
      const filter = { userEmail: { $ne: email } };

      try {
        const totalBlogs = await pendingApproval.countDocuments(filter); // Count blogs excluding the requested email
        const blogs = await pendingApproval
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalPages = Math.ceil(totalBlogs / limit);

        res.send({ blogs, totalPages });
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // get operation for length only
    app.get("/approval-req-length", async (req, res) => {
      const cursor = pendingApproval.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    // get operation for user data
    app.get("/userData", async (req, res) => {
      const email = req.query.email;

      const filter = { email: email };

      const result = await instantRUsers.findOne(filter);
      res.send(result);
    });

    // get operation for history data
    app.get("/get-approval-history-data", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(404).json({ message: "Not Found" });
      }

      const filter = { userEmail: email };

      const result = await approvalHistory
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // get operation for history data for admin
    app.get("/get-approval-history-data-for-admin", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(404).json({ message: "Not Found" });
      }

      const filter = { approverMail: email };

      const result = await adminApprovalHistory
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // get operation for others posts
    app.get("/others-posted-videos", async (req, res) => {
      const email = req.query.email; // Requested email
      const page = parseInt(req.query.page) || 1; // Current page
      const limit = parseInt(req.query.limit) || 5; // Blogs per page
      const skip = (page - 1) * limit;

      // Filter to exclude the requested email
      const filter = { userEmail: { $ne: email } };

      try {
        const totalBlogs = await instantRVideos.countDocuments(filter); // Count blogs excluding the requested email
        const blogs = await instantRVideos
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalPages = Math.ceil(totalBlogs / limit);

        res.send({ blogs, totalPages });
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send({ error: "Failed to fetch data" });
      }
    });

    // POST OPERATIONS HERE
    // post operation for users (only admin can access)
    // unique index
    await instantRUsers.createIndex({ email: 1 }, { unique: true });

    app.post("/users", async (req, res) => {
      const userToAdd = req.body;

      try {
        const result = await instantRUsers.insertOne(userToAdd);
        res.status(201).send(result); // Successful insertion
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          res
            .status(400)
            .send({ message: "User with this email already exists" });
        } else {
          // Other errors
          res.status(500).send({ message: "Server error", error });
        }
      }
    });

    // post operation for add blogs from admin panel
    app.post("/add-blogs-others", async (req, res) => {
      const newBlog = req.body;
      const newBlogWithCurrentTime = {
        ...newBlog,
        createdAt: new Date(),
      };

      const result = await pendingApproval.insertOne(newBlogWithCurrentTime);
      res.send(result);
    });

    // post operation for add blogs from admin panel
    app.post("/add-blogs-others-to-approval-history", async (req, res) => {
      const newBlog = req.body;
      const newBlogWithCurrentTime = {
        ...newBlog,
        createdAt: new Date(),
      };

      const result = await approvalHistory.insertOne(newBlogWithCurrentTime);
      res.send(result);
    });

    // post operation for add blogs in admin history
    app.post("/add-blogs-to-admin-history", async (req, res) => {
      const newBlog = req.body;
      const newBlogWithCurrentTime = {
        ...newBlog,
        createdAt: new Date(),
      };

      const result = await adminApprovalHistory.insertOne(
        newBlogWithCurrentTime
      );
      res.send(result);
    });

    // post operation for add blogs from admin panel
    app.post("/add-blogs-admin", async (req, res) => {
      const newBlog = req.body;
      const newBlogWithCurrentTime = {
        ...newBlog,
        createdAt: new Date(),
      };

      const result = await instantRBlogs.insertOne(newBlogWithCurrentTime);
      res.send(result);
    });

    // post operation for videos
    app.post("/add-videos", async (req, res) => {
      const newVideo = req.body;
      const newVideoWithCurrentTime = {
        ...newVideo,
        createdAt: new Date(),
      };

      const result = await instantRVideos.insertOne(newVideoWithCurrentTime);
      res.send(result);
    });

    // PUT OPERATIONS
    // put operation for updating the user
    app.put("/update-user", async (req, res) => {
      const email = req?.query.email;
      const userForUpdate = req.body;
      const filter = { email: email };

      const updateDoc = {
        $set: userForUpdate,
      };

      try {
        const result = await instantRUsers.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating users -->", error);
        res.status(500).send({ error: "Failed to update food." });
      }
    });

    // put operation for update blogs for admin
    app.put("/update-blogs-admin/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBlog = req.body;

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: updatedBlog,
      };

      try {
        const result = await instantRBlogs.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating blogs", error);
      }
    });

    // post operation for posting blogs after success approval
    app.post("/approve-blog-post", async (req, res) => {
      const approvedData = req.body;

      if (!approvedData) {
        return res.status(404).json({ message: "Not Found data" });
      }

      const finalApprovedData = {
        ...approvedData,
        createdAt: new Date(),
      };

      const result = await instantRBlogs.insertOne(finalApprovedData);

      res.send(result);
    });

    // patch operation for changing the blogs blogs after success approval
    app.patch("/approval-history/:id", async (req, res) => {
      const approvedHistoryData = req.body;
      const id = req.params.id;

      if (!approvedHistoryData || !id) {
        return res.status(404).json({ message: "Not Found" });
      }

      const finalApprovedData = {
        ...approvedHistoryData,
        approvedAt: new Date(),
      };

      const result = await approvalHistory.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: finalApprovedData },
        { new: false, upsert: false }
      );

      res.send({ message: "Approved Successfully" });
    });

    // patch operation for changing the blogs blogs after success approval
    app.patch("/admin-approval-history/:id", async (req, res) => {
      const approvedHistoryData = req.body;
      const id = req.params.id;

      if (!approvedHistoryData || !id) {
        return res.status(404).json({ message: "Not Found" });
      }

      const finalApprovedData = {
        ...approvedHistoryData,
        approvedAt: new Date(),
      };

      const result = await adminApprovalHistory.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: finalApprovedData },
        { new: false, upsert: false }
      );

      res.send({ message: "Approved Successfully" });
    });

    // patch for reject with feedback
    app.patch("/reject-with-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const rejectionData = req.body;
      if (!id) {
        return res.status(404).json({ message: "Not Found" });
      }

      if (!rejectionData) {
        return res.status(404).json({ message: "Not Found" });
      }

      const finalRejectionData = {
        ...rejectionData,
        approvedAt: new Date(),
      };

      const result = await approvalHistory.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: finalRejectionData },
        { new: false, upsert: false }
      );

      res.send({ message: "Rejected Successfully" });
    });

    // patch for reject with feedback
    app.patch("/admin-reject-history/:id", async (req, res) => {
      const id = req.params.id;
      const rejectionData = req.body;
      if (!id) {
        return res.status(404).json({ message: "Not Found" });
      }

      if (!rejectionData) {
        return res.status(404).json({ message: "Not Found" });
      }

      const finalRejectionData = {
        ...rejectionData,
        approvedAt: new Date(),
      };

      const result = await adminApprovalHistory.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: finalRejectionData },
        { new: false, upsert: false }
      );

      res.send({ message: "Rejected Successfully" });
    });

    // put operation for update blogs
    app.put("/update-videos/:id", async (req, res) => {
      const id = req.params.id;
      const updatedVideo = req.body;

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: updatedVideo,
      };

      try {
        const result = await instantRVideos.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating blogs", error);
      }
    });

    // PATCH OPERATION
    // post operation for view counts
    // PUT OPERATION
    app.patch("/:id", async (req, res) => {
      const blogId = req.params.id; // Get blog ID from route

      if (!blogId) {
        return res.status(404).json({ message: "Blog not found" });
      }

      try {
        const blog = await instantRBlogs.findOneAndUpdate(
          { _id: new ObjectId(blogId) }, // Match the blog by ID
          { $inc: { blog_viewCount: 1 } }, // Increment viewCount, add if it doesn't exist
          { new: true, upsert: true } // Return updated document or create if not found
        );

        if (!blog) {
          return res.status(404).json({ message: "Blog not found" });
        }

        res.status(200).json({
          message: "View count updated",
          blog_viewCount: blog.blog_viewCount,
        });
      } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Something went wrong", error });
      }
    });

    // patch for update profile info
    app.patch("/add-userData/:id", async (req, res) => {
      const id = req.params.id;
      const ImageAndName = req.body;
      if (!ImageAndName) {
        return res.status(404).json({ message: "Not Found" });
      }

      const result = await instantRUsers.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: ImageAndName },
        { new: false, upsert: false }
      );

      res.status(200).json({
        message: "Profile Updated Successfully",
      });
    });

    // DELETE OPERATIONS
    // Firebase Admin SDK
    const admin = require("./firebaseAdmin");
    // delete api for delete users
    app.delete("/delete-users", async (req, res) => {
      const email = req.query.email;

      try {
        const filter = { email: email };
        const dbResult = await instantRUsers.deleteOne(filter);

        if (dbResult.deletedCount > 0) {
          const userRecord = await admin.auth().getUserByEmail(email);
          await admin.auth().deleteUser(userRecord.uid);
          res.send({
            message: "User deleted from both MongoDB and Firebase",
            success: true,
            deletedCount: dbResult.deletedCount,
          });
        } else {
          res
            .status(404)
            .send({ message: "User not found in MongoDB", success: false });
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        res
          .status(500)
          .send({ message: "Error deleting user", error: error.message });
      }
    });

    // delete operation for delete blogs
    app.delete("/delete-blog/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await instantRBlogs.deleteOne(filter);
      res.send(result);
    });

    // delete operation for clear approval request
    app.delete("/delete-after-approval/:id", async (req, res) => {
      const id = req.params.id;

      if (!id) {
        return res.status(404).json({ message: "Request Not Found" });
      }

      const filter = { _id: new ObjectId(id) };

      const result = await pendingApproval.deleteOne(filter);

      res.send(result);
    });

    // delete operation for delete videos
    app.delete("/delete-video/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await instantRVideos.deleteOne(filter);
      res.send(result);
    });

    // delete operation for delete history card data
    app.delete("/delete-others-history-card/:id", async (req, res) => {
      const id = req.params.id;
      if (!id) {
        return res.status(404).json({ message: "Not Found" });
      }
      const filter = { _id: new ObjectId(id) };
      const result = await approvalHistory.deleteOne(filter);
      res.send(result);
    });

    // delete operation for delete history card data
    app.delete("/delete-admin-history-card/:id", async (req, res) => {
      const id = req.params.id;
      if (!id) {
        return res.status(404).json({ message: "Not Found" });
      }
      const filter = { _id: new ObjectId(id) };
      const result = await adminApprovalHistory.deleteOne(filter);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("INSTANT R IS RUNNING");
});

app.listen(port, () => {
  console.log(`INSTANT R IS RUNNING ON PORT ${port}`);
});
