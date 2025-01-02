const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middlewares
app.use(cors());
app.use(express.json());

// 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ezm1s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const instantRBlogs = client.db('InstantRDatabase').collection('instant-r-all-blogs')

    // GET OPERATIONS
    // get operation for first section card
    app.get('/home', async(req, res) => {
      const cursor = instantRBlogs.find().limit(1);
      const result = await cursor.toArray();
      res.send(result);
    })

    // get operation for blogs
    app.get('/section/blogs', async (req, res)=> {
      const cursor = instantRBlogs.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get operation for home with limit
    app.get('/featured-blogs', async (req, res) => {
      const cursor = instantRBlogs.find().skip(1).limit(15);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for details page
    app.get('/section/blog-details/:id', async(req, res)=>{
      const {id} = req.params;
      console.log(id);
      try{
        const selectedBlogForDetails = await instantRBlogs.findOne({_id: new ObjectId(id)});

        if(!selectedBlogForDetails){
          return res.status(404).send('Blog details data not found')
        }

        // find related blog in the same category
        const relatedBlogs = await instantRBlogs.find(
          {
            blog_category: {
              $regex: `^${selectedBlogForDetails.blog_category}$`,
              $options: "i"
            },
            _id: {$ne: new ObjectId(id)},
          }
        ).limit(6).toArray();

        const result = {
          selectedBlogForDetails,
          relatedBlogs,
        }

        res.send(result);
      }catch(error){
        console.error('ERROR WHILE FETCHING BLOG:', error);
        res.status(500).send('server error')
      }
    })

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