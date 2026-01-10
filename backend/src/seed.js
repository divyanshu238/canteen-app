/**
 * Database Seeding for Development
 */

import { User, Canteen, MenuItem } from './models/index.js';

export const seedDatabase = async () => {
    try {
        // Check if data already exists
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('📦 Database already has data, skipping seed');
            return;
        }

        console.log('🌱 Seeding database with demo data...');

        // Create Admin
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@canteen.com',
            password: 'admin123',
            role: 'admin',
            isApproved: true,
            isActive: true
        });
        console.log('   ✓ Admin created (admin@canteen.com / admin123)');

        // Create Partner 1 - Raju's Fast Food
        const partner1 = await User.create({
            name: 'Raju Chef',
            email: 'raju@canteen.com',
            password: 'partner123',
            role: 'partner',
            isApproved: true,
            isActive: true
        });

        const canteen1 = await Canteen.create({
            name: "Raju's Fast Food",
            description: 'Authentic Indian street food and snacks',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?fit=crop&w=400',
            ownerId: partner1._id,
            tags: ['Indian', 'Snacks', 'Fast Food'],
            priceRange: '₹50-100',
            preparationTime: '15-20 min',
            isApproved: true,
            isOpen: true,
            rating: 4.3
        });

        partner1.canteenId = canteen1._id;
        await partner1.save();

        await MenuItem.create([
            {
                canteenId: canteen1._id,
                name: 'Aloo Paratha',
                description: 'Crispy potato stuffed paratha with butter',
                price: 60,
                category: 'Breakfast',
                image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?fit=crop&w=300',
                isVeg: true,
                preparationTime: 10
            },
            {
                canteenId: canteen1._id,
                name: 'Masala Chai',
                description: 'Hot spiced Indian tea',
                price: 15,
                category: 'Beverages',
                image: 'https://images.unsplash.com/photo-1619053355099-2a91219b1016?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            {
                canteenId: canteen1._id,
                name: 'Veg Burger',
                description: 'Crispy aloo tikki burger with special sauce',
                price: 80,
                category: 'Snacks',
                image: 'https://images.unsplash.com/photo-1550547660-d94952685831?fit=crop&w=300',
                isVeg: true,
                preparationTime: 12
            },
            {
                canteenId: canteen1._id,
                name: 'Samosa (2 pcs)',
                description: 'Crispy samosas with mint chutney',
                price: 30,
                category: 'Snacks',
                image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?fit=crop&w=300',
                isVeg: true,
                preparationTime: 8
            },
            {
                canteenId: canteen1._id,
                name: 'Chole Bhature',
                description: 'Spicy chickpea curry with fluffy fried bread',
                price: 90,
                category: 'Main Course',
                image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?fit=crop&w=300',
                isVeg: true,
                preparationTime: 15
            }
        ]);
        console.log('   ✓ Partner 1 created (raju@canteen.com / partner123)');

        // Create Partner 2 - Pizza Hub
        const partner2 = await User.create({
            name: 'Pizza Master',
            email: 'pizza@canteen.com',
            password: 'partner123',
            role: 'partner',
            isApproved: true,
            isActive: true
        });

        const canteen2 = await Canteen.create({
            name: 'Pizza Hub',
            description: 'Fresh Italian pizzas and pasta',
            image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?fit=crop&w=400',
            ownerId: partner2._id,
            tags: ['Italian', 'Pizza', 'Continental'],
            priceRange: '₹150-300',
            preparationTime: '20-30 min',
            isApproved: true,
            isOpen: true,
            rating: 4.5
        });

        partner2.canteenId = canteen2._id;
        await partner2.save();

        await MenuItem.create([
            {
                canteenId: canteen2._id,
                name: 'Margherita Pizza',
                description: 'Classic pizza with mozzarella and basil',
                price: 199,
                category: 'Pizza',
                image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?fit=crop&w=300',
                isVeg: true,
                preparationTime: 20
            },
            {
                canteenId: canteen2._id,
                name: 'Pepperoni Pizza',
                description: 'Loaded with spicy pepperoni slices',
                price: 249,
                category: 'Pizza',
                image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?fit=crop&w=300',
                isVeg: false,
                preparationTime: 20
            },
            {
                canteenId: canteen2._id,
                name: 'Garlic Bread',
                description: 'Crispy garlic bread with herbs',
                price: 99,
                category: 'Sides',
                image: 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?fit=crop&w=300',
                isVeg: true,
                preparationTime: 10
            },
            {
                canteenId: canteen2._id,
                name: 'Pasta Alfredo',
                description: 'Creamy white sauce pasta',
                price: 179,
                category: 'Pasta',
                image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?fit=crop&w=300',
                isVeg: true,
                preparationTime: 15
            }
        ]);
        console.log('   ✓ Partner 2 created (pizza@canteen.com / partner123)');

        // Create a pending partner (for admin approval demo)
        const pendingPartner = await User.create({
            name: 'New Cafe Owner',
            email: 'newcafe@canteen.com',
            password: 'partner123',
            role: 'partner',
            isApproved: false,
            isActive: true
        });

        const pendingCanteen = await Canteen.create({
            name: 'New Campus Cafe',
            description: 'Fresh coffee and snacks',
            image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?fit=crop&w=400',
            ownerId: pendingPartner._id,
            tags: ['Cafe', 'Coffee', 'Snacks'],
            isApproved: false,
            isOpen: false
        });

        pendingPartner.canteenId = pendingCanteen._id;
        await pendingPartner.save();
        console.log('   ✓ Pending partner created (for approval demo)');

        // Create Student
        const student = await User.create({
            name: 'Test Student',
            email: 'student@test.com',
            password: 'student123',
            role: 'student',
            isApproved: true,
            isActive: true
        });
        console.log('   ✓ Student created (student@test.com / student123)');

        console.log('');
        console.log('🎉 Database seeded successfully!');
        console.log('');
        console.log('📋 Demo Accounts:');
        console.log('   Admin:   admin@canteen.com / admin123');
        console.log('   Partner: raju@canteen.com / partner123');
        console.log('   Partner: pizza@canteen.com / partner123');
        console.log('   Student: student@test.com / student123');
        console.log('');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    }
};

export default { seedDatabase };
