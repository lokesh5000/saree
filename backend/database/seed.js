const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = require('../supabaseService');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('Seeding database with initial data...');

        // Get or create test store
        let store;
        const { data: stores, error: storeListError } = await supabase
            .from('stores')
            .select('*')
            .eq('name', 'Test Store');

        if (storeListError) {
            console.error('Error checking stores:', storeListError.message);
            return;
        }

        if (stores && stores.length > 0) {
            console.log('Test store already exists:', stores[0].name);
            store = stores[0];
        } else {
            // Try to get any existing store first
            const { data: anyStores, error: anyStoreError } = await supabase
                .from('stores')
                .select('*')
                .limit(1);

            if (anyStores && anyStores.length > 0) {
                console.log('Using existing store:', anyStores[0].name);
                store = anyStores[0];
            } else {
                const { data: newStore, error: storeError } = await supabase
                    .from('stores')
                    .insert([
                        { name: 'Test Store', credits: 100 }
                    ])
                    .select()
                    .single();

                if (storeError) {
                    console.error('Error creating store:', storeError.message);
                    return;
                }

                console.log('Created test store:', newStore.name);
                store = newStore;
            }
        }

        // Create or get super admin user
        let superAdmin;
        const { data: existingSuperAdmin, error: findSuperAdminError } = await supabase
            .from('users')
            .select('*')
            .eq('username', 'superadmin')
            .single();

        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.username);
            superAdmin = existingSuperAdmin;
        } else {
            const superAdminPassword = await bcrypt.hash('admin123', 10);
            const { data: newSuperAdmin, error: superAdminError } = await supabase
                .from('users')
                .insert([
                    {
                        username: 'superadmin',
                        password_hash: superAdminPassword,
                        role: 'super-admin',
                        store_id: null
                    }
                ])
                .select()
                .single();

            if (superAdminError) {
                console.error('Error creating super admin:', superAdminError.message);
                return;
            }

            console.log('Created super admin user:', newSuperAdmin.username);
            superAdmin = newSuperAdmin;
        }

        // Create a store admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const { data: admin, error: adminError } = await supabase
            .from('users')
            .insert([
                {
                    username: 'admin',
                    password_hash: adminPassword,
                    role: 'admin',
                    store_id: store.id
                }
            ])
            .select()
            .single();

        if (adminError) {
            console.error('Error creating admin:', adminError.message);
            return;
        }

        console.log('Created admin user:', admin.username);

        // Create a regular user
        const userPassword = await bcrypt.hash('user123', 10);
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    username: 'testuser',
                    password_hash: userPassword,
                    role: 'user',
                    store_id: store.id
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('Error creating user:', userError.message);
            return;
        }

        console.log('Created test user:', user.username);

        // Create some test analytics data
        const { error: analyticsError } = await supabase
            .from('analytics')
            .insert([
                {
                    user_id: user.id,
                    store_id: store.id,
                    event_type: 'virtual_try_on',
                    event_data: { clothing_item: 'shirt_001', duration: 30 }
                },
                {
                    user_id: admin.id,
                    store_id: store.id,
                    event_type: 'image_upload',
                    event_data: { image_name: 'test_image.jpg' }
                },
                {
                    user_id: superAdmin.id,
                    store_id: null, // Super admin events can have null store_id
                    event_type: 'admin_action',
                    event_data: { action: 'user_created' }
                }
            ]);

        if (analyticsError) {
            console.error('Error creating analytics data:', analyticsError.message);
        } else {
            console.log('Created test analytics data');
        }

        console.log('\n=== Seeding Complete ===');
        console.log('Test accounts created:');
        console.log('Super Admin - Username: superadmin, Password: admin123');
        console.log('Store Admin - Username: admin, Password: admin123');
        console.log('Regular User - Username: testuser, Password: user123');
        console.log('Store: Test Store (100 credits)');
        console.log('Analytics: 3 test events created');

    } catch (err) {
        console.error('Seeding error:', err.message);
    }
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };