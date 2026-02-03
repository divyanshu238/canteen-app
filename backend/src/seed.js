/**
 * Database Seeding for Development
 * Updated to include items for all frontend categories:
 * Burger, Pizza, Biryani, Rolls, Coffee, Dessert, Noodles, Sandwich
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

        // ============================================
        // Partner 1 - Raju's Fast Food (Indian Street Food)
        // ============================================
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
            description: 'Authentic Indian street food, burgers, and snacks',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?fit=crop&w=400',
            ownerId: partner1._id,
            tags: ['Indian', 'Burgers', 'Fast Food', 'Rolls'],
            priceRange: '₹50-150',
            preparationTime: '15-20 min',
            isApproved: true,
            isOpen: true,
            rating: 4.3
        });

        partner1.canteenId = canteen1._id;
        await partner1.save();

        await MenuItem.create([
            // BURGER category
            {
                canteenId: canteen1._id,
                name: 'Veg Burger',
                description: 'Crispy aloo tikki burger with special sauce and fresh veggies',
                price: 80,
                category: 'Burger',
                image: 'https://images.unsplash.com/photo-1550547660-d94952685831?fit=crop&w=300',
                isVeg: true,
                preparationTime: 12
            },
            {
                canteenId: canteen1._id,
                name: 'Chicken Burger',
                description: 'Juicy chicken patty with cheese and mayo',
                price: 120,
                category: 'Burger',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?fit=crop&w=300',
                isVeg: false,
                preparationTime: 15
            },
            // ROLLS category
            {
                canteenId: canteen1._id,
                name: 'Paneer Roll',
                description: 'Grilled paneer wrapped in roomali roti with mint chutney',
                price: 90,
                category: 'Rolls',
                image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?fit=crop&w=300',
                isVeg: true,
                preparationTime: 10
            },
            {
                canteenId: canteen1._id,
                name: 'Chicken Tikka Roll',
                description: 'Spicy chicken tikka wrapped with onions and green chutney',
                price: 110,
                category: 'Rolls',
                image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?fit=crop&w=300',
                isVeg: false,
                preparationTime: 12
            },
            // SANDWICH category
            {
                canteenId: canteen1._id,
                name: 'Grilled Veg Sandwich',
                description: 'Toasted sandwich with fresh veggies and cheese',
                price: 60,
                category: 'Sandwich',
                image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?fit=crop&w=300',
                isVeg: true,
                preparationTime: 8
            },
            // COFFEE category
            {
                canteenId: canteen1._id,
                name: 'Hot Coffee',
                description: 'Freshly brewed hot coffee',
                price: 30,
                category: 'Coffee',
                image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            {
                canteenId: canteen1._id,
                name: 'Cold Coffee',
                description: 'Refreshing cold coffee with ice cream',
                price: 60,
                category: 'Coffee',
                image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            // Other items
            {
                canteenId: canteen1._id,
                name: 'Samosa (2 pcs)',
                description: 'Crispy samosas with mint chutney',
                price: 30,
                category: 'Snacks',
                image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?fit=crop&w=300',
                isVeg: true,
                preparationTime: 8
            }
        ]);
        console.log('   ✓ Partner 1 created (raju@canteen.com / partner123)');

        // ============================================
        // Partner 2 - Pizza Hub (Italian)
        // ============================================
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
            description: 'Fresh Italian pizzas, pasta, and desserts',
            image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?fit=crop&w=400',
            ownerId: partner2._id,
            tags: ['Italian', 'Pizza', 'Continental', 'Desserts'],
            priceRange: '₹150-300',
            preparationTime: '20-30 min',
            isApproved: true,
            isOpen: true,
            rating: 4.5
        });

        partner2.canteenId = canteen2._id;
        await partner2.save();

        await MenuItem.create([
            // PIZZA category
            {
                canteenId: canteen2._id,
                name: 'Margherita Pizza',
                description: 'Classic pizza with mozzarella and fresh basil',
                price: 199,
                category: 'Pizza',
                image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?fit=crop&w=300',
                isVeg: true,
                preparationTime: 20
            },
            {
                canteenId: canteen2._id,
                name: 'Pepperoni Pizza',
                description: 'Loaded with spicy pepperoni slices and cheese',
                price: 249,
                category: 'Pizza',
                image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?fit=crop&w=300',
                isVeg: false,
                preparationTime: 20
            },
            {
                canteenId: canteen2._id,
                name: 'Veggie Supreme Pizza',
                description: 'Loaded with bell peppers, olives, mushrooms, and onions',
                price: 229,
                category: 'Pizza',
                image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?fit=crop&w=300',
                isVeg: true,
                preparationTime: 22
            },
            // DESSERT category
            {
                canteenId: canteen2._id,
                name: 'Chocolate Brownie',
                description: 'Warm chocolate brownie with vanilla ice cream',
                price: 120,
                category: 'Dessert',
                image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            {
                canteenId: canteen2._id,
                name: 'Tiramisu',
                description: 'Classic Italian coffee-flavored dessert',
                price: 150,
                category: 'Dessert',
                image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            // NOODLES category
            {
                canteenId: canteen2._id,
                name: 'Pasta Alfredo',
                description: 'Creamy white sauce pasta with herbs',
                price: 179,
                category: 'Noodles',
                image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?fit=crop&w=300',
                isVeg: true,
                preparationTime: 15
            },
            // COFFEE category
            {
                canteenId: canteen2._id,
                name: 'Espresso',
                description: 'Strong Italian espresso shot',
                price: 50,
                category: 'Coffee',
                image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?fit=crop&w=300',
                isVeg: true,
                preparationTime: 3
            },
            {
                canteenId: canteen2._id,
                name: 'Cappuccino',
                description: 'Espresso with steamed milk foam',
                price: 80,
                category: 'Coffee',
                image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            }
        ]);
        console.log('   ✓ Partner 2 created (pizza@canteen.com / partner123)');

        // ============================================
        // Partner 3 - Biryani Palace (New canteen for Biryani)
        // ============================================
        const partner3 = await User.create({
            name: 'Biryani Chef',
            email: 'biryani@canteen.com',
            password: 'partner123',
            role: 'partner',
            isApproved: true,
            isActive: true
        });

        const canteen3 = await Canteen.create({
            name: 'Biryani Palace',
            description: 'Authentic Hyderabadi biryani and kebabs',
            image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?fit=crop&w=400',
            ownerId: partner3._id,
            tags: ['Indian', 'Biryani', 'Mughlai', 'Non-Veg'],
            priceRange: '₹150-250',
            preparationTime: '25-35 min',
            isApproved: true,
            isOpen: true,
            rating: 4.6
        });

        partner3.canteenId = canteen3._id;
        await partner3.save();

        await MenuItem.create([
            // BIRYANI category
            {
                canteenId: canteen3._id,
                name: 'Chicken Biryani',
                description: 'Aromatic basmati rice with tender chicken and spices',
                price: 180,
                category: 'Biryani',
                image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?fit=crop&w=300',
                isVeg: false,
                preparationTime: 25
            },
            {
                canteenId: canteen3._id,
                name: 'Mutton Biryani',
                description: 'Slow-cooked mutton biryani with rich spices',
                price: 220,
                category: 'Biryani',
                image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?fit=crop&w=300',
                isVeg: false,
                preparationTime: 30
            },
            {
                canteenId: canteen3._id,
                name: 'Veg Biryani',
                description: 'Fragrant vegetable biryani with paneer and mixed veggies',
                price: 150,
                category: 'Biryani',
                image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?fit=crop&w=300',
                isVeg: true,
                preparationTime: 22
            },
            // ROLLS category
            {
                canteenId: canteen3._id,
                name: 'Mutton Seekh Roll',
                description: 'Minced mutton seekh kebab wrapped in paratha',
                price: 130,
                category: 'Rolls',
                image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?fit=crop&w=300',
                isVeg: false,
                preparationTime: 15
            },
            // DESSERT category
            {
                canteenId: canteen3._id,
                name: 'Gulab Jamun (2 pcs)',
                description: 'Soft milk dumplings soaked in sugar syrup',
                price: 50,
                category: 'Dessert',
                image: 'https://images.unsplash.com/photo-1666190094698-3a4c49c9b40d?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            },
            {
                canteenId: canteen3._id,
                name: 'Kheer',
                description: 'Creamy rice pudding with nuts and cardamom',
                price: 60,
                category: 'Dessert',
                image: 'https://images.unsplash.com/photo-1645177628172-aab9602c8f50?fit=crop&w=300',
                isVeg: true,
                preparationTime: 5
            }
        ]);
        console.log('   ✓ Partner 3 created (biryani@canteen.com / partner123)');

        // ============================================
        // Partner 4 - Noodle Box (Chinese/Asian)
        // ============================================
        const partner4 = await User.create({
            name: 'Noodle Master',
            email: 'noodle@canteen.com',
            password: 'partner123',
            role: 'partner',
            isApproved: true,
            isActive: true
        });

        const canteen4 = await Canteen.create({
            name: 'Noodle Box',
            description: 'Authentic Chinese noodles and Indo-Chinese favorites',
            image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?fit=crop&w=400',
            ownerId: partner4._id,
            tags: ['Chinese', 'Asian', 'Noodles', 'Fast Food'],
            priceRange: '₹100-200',
            preparationTime: '15-25 min',
            isApproved: true,
            isOpen: true,
            rating: 4.2
        });

        partner4.canteenId = canteen4._id;
        await partner4.save();

        await MenuItem.create([
            // NOODLES category
            {
                canteenId: canteen4._id,
                name: 'Hakka Noodles',
                description: 'Stir-fried noodles with vegetables and soy sauce',
                price: 120,
                category: 'Noodles',
                image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?fit=crop&w=300',
                isVeg: true,
                preparationTime: 12
            },
            {
                canteenId: canteen4._id,
                name: 'Chilli Garlic Noodles',
                description: 'Spicy noodles with garlic and chilli',
                price: 130,
                category: 'Noodles',
                image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?fit=crop&w=300',
                isVeg: true,
                preparationTime: 15
            },
            {
                canteenId: canteen4._id,
                name: 'Chicken Chow Mein',
                description: 'Classic chow mein with chicken and vegetables',
                price: 150,
                category: 'Noodles',
                image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?fit=crop&w=300',
                isVeg: false,
                preparationTime: 18
            },
            // ROLLS category
            {
                canteenId: canteen4._id,
                name: 'Spring Roll (4 pcs)',
                description: 'Crispy vegetable spring rolls with sweet chilli sauce',
                price: 80,
                category: 'Rolls',
                image: 'https://images.unsplash.com/photo-1548507200-2b196c512c39?fit=crop&w=300',
                isVeg: true,
                preparationTime: 10
            },
            // SANDWICH category
            {
                canteenId: canteen4._id,
                name: 'Schezwan Sandwich',
                description: 'Spicy schezwan mayo sandwich with veggies',
                price: 70,
                category: 'Sandwich',
                image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?fit=crop&w=300',
                isVeg: true,
                preparationTime: 8
            }
        ]);
        console.log('   ✓ Partner 4 created (noodle@canteen.com / partner123)');

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
        console.log('   Partner: biryani@canteen.com / partner123');
        console.log('   Partner: noodle@canteen.com / partner123');
        console.log('   Student: student@test.com / student123');
        console.log('');
        console.log('📂 Categories Available:');
        console.log('   Burger, Pizza, Biryani, Rolls, Coffee, Dessert, Noodles, Sandwich');
        console.log('');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    }
};

export default { seedDatabase };
