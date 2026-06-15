require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('./src/config/database');
const User = require('./src/models/User');
const Design = require('./src/models/Design');
const Drop = require('./src/models/Drop');

const seed = async () => {
  await connectDB();

  const force = process.argv.includes('--force');
  const existingDrops = await Drop.countDocuments();
  if (existingDrops > 0 && !force) {
    console.log(`DB already has ${existingDrops} drops. Skipping. Use: npm run seed -- --force to reset.`);
    process.exit(0);
  }

  await User.deleteMany({});
  await Design.deleteMany({});
  await Drop.deleteMany({});
  console.log('Cleared existing data');

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@limitwear.com',
    password: 'admin123',
    role: 'admin',
    balance: 0,
  });

  const designer = await User.create({
    name: 'Alex Design',
    email: 'designer@limitwear.com',
    password: 'designer123',
    role: 'designer',
    balance: 5000,
    verificationStatus: 'approved',
    designerInfo: { bio: 'Streetwear designer from Kyiv', totalSales: 0 },
  });

  const customer = await User.create({
    name: 'Test User',
    email: 'user@limitwear.com',
    password: 'user123',
    role: 'customer',
    balance: 10000,
  });

  console.log('Users created');

  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in10days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const design1 = await Design.create({
    designer: designer._id,
    title: 'Rebel Hoodie',
    description: 'Oversized heavyweight cotton hoodie with bold embroidered logo. Drop shoulder fit, kangaroo pocket.',
    category: 'hoodie',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80',
    suggestedPrice: 1000,
    suggestedQuantity: 50,
    status: 'approved',
    moderatedBy: admin._id,
    moderatedAt: new Date(),
  });

  const design2 = await Design.create({
    designer: designer._id,
    title: 'Urban Jacket',
    description: 'Camo pattern windbreaker with tactical pockets. Water-resistant shell, mesh lining.',
    category: 'jacket',
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
    suggestedPrice: 1000,
    suggestedQuantity: 50,
    status: 'approved',
    moderatedBy: admin._id,
    moderatedAt: new Date(),
  });

  const design3 = await Design.create({
    designer: designer._id,
    title: 'Cargo',
    description: 'Tactical cargo pants with 6 pockets, adjustable waist, and tapered leg.',
    category: 'pants',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
    suggestedPrice: 1000,
    suggestedQuantity: 50,
    status: 'approved',
    moderatedBy: admin._id,
    moderatedAt: new Date(),
  });

  const design4 = await Design.create({
    designer: designer._id,
    title: 'Void Tee',
    description: 'Premium 220gsm cotton tee with distressed print. Regular fit, ribbed collar.',
    category: 'tshirt',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    suggestedPrice: 600,
    suggestedQuantity: 100,
    status: 'pending',
  });

  console.log('Designs created');

  const drop1 = await Drop.create({
    design: design1._id,
    designer: designer._id,
    title: design1.title,
    description: design1.description,
    category: design1.category,
    imageUrl: design1.imageUrl,
    price: 1000,
    totalQuantity: 50,
    reservedQuantity: 20,
    deadline: in3days,
    status: 'active',
    isNewDrop: true,
    designerShare: 20,
    tags: ['hoodie', 'oversized', 'streetwear'],
  });

  const drop2 = await Drop.create({
    design: design2._id,
    designer: designer._id,
    title: design2.title,
    description: design2.description,
    category: design2.category,
    imageUrl: design2.imageUrl,
    price: 1000,
    totalQuantity: 50,
    reservedQuantity: 30,
    deadline: in7days,
    status: 'active',
    isNewDrop: false,
    designerShare: 20,
    tags: ['jacket', 'camo', 'tactical'],
  });

  const drop3 = await Drop.create({
    design: design3._id,
    designer: designer._id,
    title: design3.title,
    description: design3.description,
    category: design3.category,
    imageUrl: design3.imageUrl,
    price: 1000,
    totalQuantity: 50,
    reservedQuantity: 10,
    deadline: in10days,
    status: 'active',
    isNewDrop: false,
    designerShare: 20,
    tags: ['pants', 'cargo', 'tactical'],
  });

  // 5 extra drops with different statuses
  const extraDrops = [
    {
      title: 'Shadow Windbreaker',
      description: 'Легка куртка-вітровка з капюшоном, бічними кишенями на блискавці та водовідштовхувальним покриттям. Ідеальна для міських прогулянок.',
      category: 'jacket',
      imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=80',
      price: 1400, totalQuantity: 40, reservedQuantity: 40,
      deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: 'funded', isNewDrop: false,
    },
    {
      title: 'Void Tee',
      description: 'Преміум бавовняна футболка 220gsm з дистрес-принтом. Regular fit, рубчастий комір. Пігментне фарбування для вінтажного ефекту.',
      category: 'tshirt',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
      price: 650, totalQuantity: 100, reservedQuantity: 35,
      deadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      status: 'failed', isNewDrop: false,
    },
    {
      title: 'Phantom Hoodie',
      description: 'Оверсайз худі з важкого флісу 400gsm. Вишитий логотип, потрійна строчка, посилені кишені. Обмежена серія — лише 30 штук.',
      category: 'hoodie',
      imageUrl: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=600&q=80',
      price: 1800, totalQuantity: 30, reservedQuantity: 30,
      deadline: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      status: 'manufacturing', isNewDrop: false,
    },
    {
      title: 'Tech Fleece Pants',
      description: 'Спортивні штани з технічного флісу. Зауженого крою, бічні кишені на замку, еластичний пояс з тасьмою. Для вулиці і не тільки.',
      category: 'pants',
      imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80',
      price: 900, totalQuantity: 60, reservedQuantity: 12,
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: 'active', isNewDrop: true,
    },
    {
      title: 'Chrome Cap',
      description: 'Бейсболка з рефлективною вишивкою та регульованим ремінцем. 6-панельна конструкція, підкладка з сітки для вентиляції.',
      category: 'accessories',
      imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80',
      price: 450, totalQuantity: 80, reservedQuantity: 61,
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'active', isNewDrop: true,
    },
  ];

  for (const d of extraDrops) {
    const design = await Design.create({
      designer: designer._id,
      title: d.title, description: d.description, category: d.category,
      imageUrl: d.imageUrl, suggestedPrice: d.price, suggestedQuantity: d.totalQuantity,
      status: 'approved', moderatedBy: admin._id, moderatedAt: new Date(),
    });
    const drop = await Drop.create({
      design: design._id, designer: designer._id,
      title: d.title, description: d.description, category: d.category,
      imageUrl: d.imageUrl, price: d.price, totalQuantity: d.totalQuantity,
      reservedQuantity: d.reservedQuantity, deadline: d.deadline,
      status: d.status, isNewDrop: d.isNewDrop, designerShare: 20,
    });
    design.drop = drop._id;
    await design.save();
  }

  design1.drop = drop1._id;
  design2.drop = drop2._id;
  design3.drop = drop3._id;
  await design1.save();
  await design2.save();
  await design3.save();

  console.log('Drops created');
  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin:    admin@limitwear.com / admin123');
  console.log('Designer: designer@limitwear.com / designer123');
  console.log('Customer: user@limitwear.com / user123 (balance: 10,000 UAH)');
  console.log('===================\n');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
