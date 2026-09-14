const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Item = require('./models/Item');

dotenv.config();

const sampleItems = [
  { id: 'p1', name: 'Kadhai Chaap', price: 270, category: 'mains', currentStock: 50, isAvailable: true },
  { id: 'p2', name: 'Cheese Garlic Bread', price: 140, category: 'breakfast', currentStock: 50, isAvailable: true },
  { id: 'p3', name: 'White Sauce Pasta', price: 220, category: 'mains', currentStock: 50, isAvailable: true },
  { id: 'p4', name: 'Chocolate Brownie', price: 90, category: 'desserts', currentStock: 50, isAvailable: true },
  { id: 'p5', name: 'Cold Coffee', price: 110, category: 'drinks', currentStock: 50, isAvailable: true }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Item.deleteMany({});
    await Item.insertMany(sampleItems);
    console.log('✅ Menu Items Successfully Inserted into Database with Categories!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();