const express = require('express');
const supabase = require('../supabaseService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, role, storeId } = req.body;

  try {
    // Check if user already exists in our 'users' table
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    if (findError && findError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Supabase find user error:', findError.message);
        return res.status(500).json({ msg: 'Server error during user lookup' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userRole = role || 'user';
    let userStoreId = storeId;

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
      .select()
      .single();

    if (insertError) {
        console.error('Supabase insert user error:', insertError.message);
        return res.status(500).json({ msg: 'Server error during user registration' });
    }

    // Note: Supabase handles session management and JWTs internally.
    // For our custom 'users' table, we will need to generate a JWT manually if we want to mimic the previous behavior.
    // However, given the shift to Supabase, it might be better to rely on Supabase's built-in auth for frontend.
    // For now, we'll just return success.
    res.status(201).json({
      msg: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        store_id: newUser.store_id,
      },
      // You would typically get a JWT from Supabase's auth.signUp/signIn here
    });
  } catch (err) {
    console.error("Auth register catch error:", err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (from our custom users table)
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (findError || !user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // For custom users table, we need to manually generate a JWT for this user for future requests
    // This JWT will contain the user's ID and role for authorization middleware
    const payload = {
        id: user.id,
        role: user.role,
        store_id: user.store_id
    };
    const token = await jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });


    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        store_id: user.store_id,
      },
    });
  } catch (err) {
    console.error("Auth login catch error:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
