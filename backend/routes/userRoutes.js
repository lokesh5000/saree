const express = require('express');
const supabase = require('../supabaseService');
const bcrypt = require('bcryptjs');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/users/create
// @desc    Admin/Super-Admin creates a new user
// @access  Private (Admin, Super-Admin)
router.post('/create', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  const { username, password, role, storeId } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    if (findError && findError.code !== 'PGRST116') {
        console.error('Supabase find user error:', findError.message);
        return res.status(500).json({ msg: 'Server error during user lookup' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userRole = role || 'user';
    let userStoreId = storeId;

    // If admin is creating a user, ensure the user belongs to their store
    if (req.user.role === 'admin' && userStoreId !== req.user.storeId) {
      return res.status(403).json({ msg: 'Admins can only create users within their own store' });
    }

    if (userRole === 'super-admin') {
      userStoreId = null; // Super-admin doesn't have a storeId
    } else if (!userStoreId) {
      return res.status(400).json({ msg: 'Store ID is required for non-super-admin roles' });
    } else {
        // Validate storeId exists if provided
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('id', userStoreId)
            .single();

        if (storeError || !store) {
            return res.status(400).json({ msg: 'Invalid storeId provided' });
        }
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { username, password_hash, role: userRole, store_id: userStoreId }
      ])
      .select('id, username, role, store_id')
      .single();

    if (insertError) {
        console.error('Supabase insert user error:', insertError.message);
        return res.status(500).json({ msg: 'Server error during user creation' });
    }

    res.status(201).json({ msg: 'User created successfully', user: newUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/users
// @desc    Super-Admin gets all users, Admin gets users from their store
// @access  Private (Admin, Super-Admin)
router.get('/', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    let query = supabase.from('users').select('id, username, role, store_id, stores(name)');

    if (req.user.role === 'admin') {
      query = query.eq('store_id', req.user.storeId);
    }
    
    const { data: users, error } = await query;

    if (error) {
        console.error('Supabase fetch users error:', error.message);
        return res.status(500).json({ msg: 'Server error fetching users' });
    }
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/users/:id
// @desc    Super-Admin deletes a user, Admin deletes a user from their store
// @access  Private (Admin, Super-Admin)
router.delete('/:id', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Prevent a user from deleting themselves
    if (req.user.id === userIdToDelete) {
      return res.status(400).json({ msg: 'Cannot delete your own user account' });
    }

    let query = supabase.from('users').delete().eq('id', userIdToDelete);

    // If admin, ensure they can only delete users within their store
    if (req.user.role === 'admin') {
      query = query.eq('store_id', req.user.storeId);
    }

    const { error } = await query;

    if (error) {
      console.error('Supabase delete user error:', error.message);
      return res.status(500).json({ msg: 'Server error deleting user', error: error.message });
    }

    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
