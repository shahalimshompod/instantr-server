const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middlewares
app.use(cors());
app.use(express.json());

//instant-r-database-uri-username
//VQv40RsyvkLifAqa

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ezm1s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mfxvb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const uri = "mongodb+srv://instant-r-database-uri-username:<db_password>@cluster0.mfxvb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // database collection
    const instantRBlogs = client.db('instantr07').collection('instant-r-all-blogs')
    const instantRVideos = client.db('instantr07').collection('instant-r-videos')

    // GET OPERATIONS
    // get operation for first section card
    app.get('/home', async (req, res) => {
      const cursor = instantRBlogs.find().limit(1);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get operation for well home first section card
    app.get('/well/home', async (req, res) => {
      const categories = ['Health', 'Life', 'Food', 'Mind'];

      const cursor = instantRBlogs.find({ blog_category: { $in: categories } }).limit(1);
      const result = await cursor.toArray();
      res.send(result);
    });


    // get operation for blogs
    // Get operation for blogs with pagination
    app.get('/section/blogs', async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 45;

      const totalCount = await instantRBlogs.countDocuments(); // Total number of blogs
      const cursor = instantRBlogs.find().skip(page * size).limit(size);
      const result = await cursor.toArray();
      res.send({ blogData: result, totalCount });
    });


    // get operation for home with limit
    app.get('/featured-blogs', async (req, res) => {
      const cursor = instantRBlogs.find().skip(1).limit(11);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for details page
    app.get('/blog-details/:id', async (req, res) => {
      const { id } = req.params;

      try {
        const selectedBlogForDetails = await instantRBlogs.findOne({ _id: new ObjectId(id) });

        if (!selectedBlogForDetails) {
          return res.status(404).send('Blog details data not found')
        }

        // find latest blog in the same category
        const relatedBlogs = await instantRBlogs.find(
          {
            blog_category: {
              $regex: `^${selectedBlogForDetails.blog_category}$`,
              $options: "i"
            },
            _id: { $ne: new ObjectId(id) },
          }
        ).limit(8).toArray();

        // find most popular blog for same category.
        const popularBlogs = await instantRBlogs.find(
          {
            blog_category: {
              $regex: `^${selectedBlogForDetails.blog_category}$`,
              $options: "i"
            },
            _id: { $ne: new ObjectId(id) },
          }
        ).sort({ blog_viewCount: -1 }).limit(8).toArray();

        const result = {
          selectedBlogForDetails,
          relatedBlogs,
          popularBlogs,
        }

        res.send(result);
      } catch (error) {
        console.error('ERROR WHILE FETCHING BLOG:', error);
        res.status(500).send('server error')
      }
    })


    // get operation for category wise blogs routes
    // Get operation for category-wise blogs routes with pagination
    app.get('/section/:category', async (req, res) => {
      const { category } = req.params;
      const page = parseInt(req.query.page) || 0; // Default to page 0
      const size = parseInt(req.query.size) || 45; // Default to 50 items per page

      if (!category) {
        return res.status(404).send('Category not found');
      }

      const query = {
        blog_category: {
          $regex: `^${category}$`,
          $options: "i"
        }
      };

      const totalCount = await instantRBlogs.countDocuments(query); // Count total matching documents
      const cursor = instantRBlogs.find(query).skip(page * size).limit(size);
      const result = await cursor.toArray();

      res.send({ blogData: result, totalCount });
    });



    // get operation for category wise blogs for home route and showing blogs cards by 4.
    app.get('/home-category-sections', async (req, res) => {
      try {
        const categories = await instantRBlogs.aggregate([
          { $group: { _id: "$blog_category" } }
        ]).toArray();

        const blogsByCategory = {};

        for (const categoryObj of categories) {
          const category = categoryObj._id;
          const blogs = await instantRBlogs
            .find({ blog_category: category })
            .limit(4)
            .toArray();

          blogsByCategory[category] = blogs;
        }

        res.status(200).send(blogsByCategory);
      } catch (err) {
        console.error('Error:', err);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });


    // get operation for well home category section
    app.get('/well/home-category-sections', async (req, res) => {
      try {
        // Define the categories you want
        const desiredCategories = ["Life", "Mind", "Food", "Health"];

        // Filter for desired categories
        const categories = await instantRBlogs.aggregate([
          { $match: { blog_category: { $in: desiredCategories } } }, // Filter by desired categories
          { $group: { _id: "$blog_category" } }
        ]).toArray();

        const blogsByCategory = {};

        for (const categoryObj of categories) {
          const category = categoryObj._id;
          const blogs = await instantRBlogs
            .find({ blog_category: category })
            .limit(4)
            .toArray();

          blogsByCategory[category] = blogs;
        }

        res.status(200).send(blogsByCategory);
      } catch (err) {
        console.error('Error:', err);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });



    // get operation for latest blog
    app.get('/latest-blogs', async (req, res) => {
      const cursor = instantRBlogs.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    })


    // get operation for latest blog in search 
    app.get('/latest-blogs-in-search', async (req, res) => {
      const cursor = instantRBlogs.find().limit(12);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get operation for newsletter section in home route.
    app.get('/newsletters', async (req, res) => {
      const query = {
        blog_category: {
          $regex: `^${`newsletters`}$`,
          $options: "i"
        }
      }
      const cursor = instantRBlogs.find(query).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get operation for popular blogs sections
    app.get('/most-popular', async (req, res) => {
      const cursor = instantRBlogs.find().sort({ blog_viewCount: -1 }).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for popular blogs sections
    app.get('/most-popular-for-details-page', async (req, res) => {
      const cursor = instantRBlogs.find().sort({ blog_viewCount: -1 }).limit(8);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for search route
    // Search Route
    app.get('/search', async (req, res) => {
      const query = req.query.query;


      if (!query) {
        return res.status(400).send('Query parameter is required');
      }

      try {
        const results = await instantRBlogs.find({
          $or: [
            { blog_title: { $regex: query, $options: 'i' } },
            { blog_category: { $regex: query, $options: 'i' } },
            { blog_subheading: { $regex: query, $options: 'i' } }
          ]
        }).toArray();


        // Send the results in the response
        res.json(results);
      } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Error fetching search results');
      }
    });

    // get operations for all video route
    app.get('/videos', async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 35;

      const totalCount = await instantRVideos.countDocuments(); // Total number of videos
      const cursor = instantRVideos.find().skip(page * size).limit(size);
      const result = await cursor.toArray();

      res.send({ videos: result, totalCount });
    });


    // get operations for home video section
    app.get('/video-section', async (req, res) => {
      const cursor = instantRVideos.find().limit(10);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get all data
    app.get('/allData', async (req, res) => {
      const cursor = instantRBlogs.find();
      const result = await cursor.toArray();
      res.send(result)
    })




    // POST OPERATION
    // post operation for view counts
    // PUT OPERATION
    app.patch('/:id', async (req, res) => {
      const blogId = req.params.id; // Get blog ID from route


      try {
        const blog = await instantRBlogs.findOneAndUpdate(
          { _id: new ObjectId(blogId) }, // Match the blog by ID
          { $inc: { blog_viewCount: 1 } }, // Increment viewCount, add if it doesn't exist
          { new: true, upsert: true } // Return updated document or create if not found
        );

        if (!blog) {
          return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({ message: 'View count updated', blog_viewCount: blog.blog_viewCount });
      } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: 'Something went wrong', error });
      }
    });



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
  res.send('INSTANT R IS RUNNING')
})

app.listen(port, () => {
  console.log(`INSTANT R IS RUNNING ON PORT ${port}`);
})