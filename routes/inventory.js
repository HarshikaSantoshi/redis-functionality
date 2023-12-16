const express = require('express');
const { createClient } = require("redis");
var app = express.Router();

let redisClient = null;

// Middleware to establish Redis connection
app.use(async (req, res, next) => {
 redisClient = await createClient()
    .on("error", (err) => console.log("Redis Client connection error " + err))
    .connect();

// console.log("Connected to Redis Client", redisClient);

 next();
});


app.get('/add', function (req, res, next) {
 res.render('inventory/inventory_add');
});

app.post('/add', async (req, res) => {
  const { inventoryId, productID, product_name, product_brand } = req.body;

 try {
    // Check if the inventory hash exists
   // const hashExists = await redisClient.exists(`inventory:${inventoryId}`);

    //if (!hashExists) {
      await redisClient.hSet(`inventory:${inventoryId}`, productID, JSON.stringify({ product_name, product_brand }));
  } catch (err) {
    console.error('Error adding product to inventory', err);
    res.status(500).send('Error adding product to inventory');
  }
});


// Handle form submission to edit a product
app.post('/edit/:inventoryID/:productID', async (req, res) => {
  const inventoryID = req.params.inventoryID;
  const productID = req.params.productID;
  const { product_name, product_brand } = req.body;

  try {
    const key = `inventory:${inventoryID}`;
    const productDetails = JSON.stringify({ product_name, product_brand });

    // Check if the inventory hash exists
    const hashExists = await redisClient.exists(key);

    if (hashExists) {
      // Check if the product exists in the inventory
      const productExists = await redisClient.exists(key, productID);

      if (productExists) {
        await redisClient.hSet(key, productID, productDetails);
        res.redirect(`/inventory/edit/${inventoryID}/${productID}`);
      } else {
        res.status(404).send('Product not found');
      }
    } else {
      res.status(404).send('Inventory not found');
    }
  } catch (err) {
    console.error('Error editing product:', err);
    res.status(500).send('Error editing product');
  }
});


// Delete a product from inventory
app.post('/delete', async (req, res) => {
  const { productID, inventoryID } = req.body;

  try {
    await redisClient.del(`inventory:${inventoryID}`, productID);
    res.redirect(`/inventory/${inventoryID}`);
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).send('Error deleting product');
  }
});




// Render the form to edit a product
app.get('/edit/:inventoryID/:productID', async (req, res) => {
  const inventoryID = req.params.inventoryID;
  const productID = req.params.productID;

  try {
    const key = `inventory:${inventoryID}`;
    const productDetails = await redisClient.hGet(key, productID);
    
  
    if (productDetails) {
      const product = JSON.parse(productDetails);
      
      res.render('inventory/inventory_edit', { inventoryID, productID, product });
    } else {
      res.status(404).send('Product not found');
    }
  } catch (err) {
    console.error('Error retrieving product details:', err);
    res.status(500).send('Error retrieving product details');
  }
});

// Home page - Display all products in inventory
app.get('/display', async (req, res) => {
  const inventoryID = req.query.inventoryID || 9;

  try {
    const products = await redisClient.hGetAll(`inventory:${inventoryID}`);
    console.log(products);
    console.log(inventoryID);
    res.render('inventory/inventory_display', { products, inventoryID });
  } catch (err) {
    console.error('Error retrieving products:', err);
    res.status(500).send('Error retrieving products');
  }
});


// Delete a product
app.get('/delete/:inventoryID/:productID', async (req, res) => {
  const inventoryID = req.params.inventoryID;
  const productID = req.params.productID;

  try {
    await redisClient.hDel(`inventory:${inventoryID}`, productID);
    res.redirect(`/?inventoryID=${inventoryID}`);
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).send('Error deleting product');
  }
});

// Middleware to close Redis connection
app.use(async (req, res, next) => {
 await redisClient.disconnect();
 console.log("Disconnected from Redis Client");

 next();
});

module.exports = app;