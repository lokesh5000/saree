const express = require('express');
const supabase = require('../supabaseService');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/stores/create
// @desc    Super-Admin creates a new store
// @access  Private (Super-Admin)
router.post('/create', protect, authorizeRoles('super-admin'), async (req, res) => {
  const { name, credits } = req.body;

  try {
    const { data: existingStore, error: findError } = await supabase
      .from('stores')
      .select('id')
      .eq('name', name)
      .single();

    if (existingStore) {
      return res.status(400).json({ msg: 'Store name already exists' });
    }
    if (findError && findError.code !== 'PGRST116') {
        console.error('Supabase find store error:', findError.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error during store lookup' 
        });
    }

    const { data: newStore, error: insertError } = await supabase
      .from('stores')
      .insert([
        { name, credits: credits || 0 }
      ])
      .select()
      .single();

    if (insertError) {
        console.error('Supabase insert store error:', insertError.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error during store creation' 
        });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Store created successfully', 
      data: newStore 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   PUT /api/stores/:id/credits
// @desc    Super-Admin adds credits to a store
// @access  Private (Super-Admin)
router.put('/:id/credits', protect, authorizeRoles('super-admin'), async (req, res) => {
  const { credits } = req.body;

  try {
    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('credits')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }

    const newCredits = store.credits + credits;

    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({ credits: newCredits })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
        console.error('Supabase update credits error:', updateError.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error updating credits' 
        });
    }

    res.json({ 
      success: true, 
      message: 'Credits added successfully', 
      data: updatedStore 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   PUT /api/stores/:id/deduct-credit
// @desc    Deduct one credit from a store
// @access  Private (User, Admin, Super-Admin)
router.put('/:id/deduct-credit', protect, authorizeRoles('user', 'admin', 'super-admin'), async (req, res) => {
  try {
    console.log(`Deducting credit from store ${req.params.id} for user ${req.user.id} (${req.user.role})`);
    
    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('credits')
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      console.error('Error fetching store for credit deduction:', fetchError.message);
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found', 
        error: fetchError.message 
      });
    }

    if (!store) {
      console.log('Store not found for credit deduction');
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }

    console.log(`Current store credits: ${store.credits}`);

    if (store.credits <= 0) {
      console.log('Insufficient credits for deduction');
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient credits', 
        data: { currentCredits: store.credits } 
      });
    }

    const newCredits = store.credits - 1;
    console.log(`Deducting 1 credit, new total: ${newCredits}`);

    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({ credits: newCredits })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
        console.error('Supabase deduct credit error:', updateError.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error deducting credit', 
          error: updateError.message 
        });
    }

    // Return consistent format
    res.json({ 
      success: true, 
      message: 'Credit deducted successfully', 
      data: updatedStore 
    });
  } catch (err) {
    console.error('Error in credit deduction:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   GET /api/stores/:id
// @desc    Get a single store by ID
// @access  Private (User, Admin, Super-Admin - for checking credits)
router.get('/:id', protect, authorizeRoles('user', 'admin', 'super-admin'), async (req, res) => {
  try {
    console.log(`Fetching store ${req.params.id} for user ${req.user.id} (${req.user.role})`);
    
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('Supabase error fetching store:', error.message);
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found', 
        error: error.message 
      });
    }
    
    if (!store) {
      console.log('Store not found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }
    
    console.log(`Store found: ${store.name} with ${store.credits} credits`);
    
    // Return consistent format that matches frontend expectations
    res.json({ 
      success: true, 
      data: store 
    });
  } catch (err) {
    console.error('Error fetching store:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   GET /api/stores
// @desc    Super-Admin gets all stores
// @access  Private (Super-Admin)
router.get('/', protect, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*');

    if (error) {
        console.error('Supabase fetch stores error:', error.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error fetching stores' 
        });
    }
    res.json({ 
      success: true, 
      data: stores 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   DELETE /api/stores/:id
// @desc    Super-Admin deletes a store
// @access  Private (Super-Admin)
router.delete('/:id', protect, authorizeRoles('super-admin'), async (req, res) => {
  try {
    const storeIdToDelete = req.params.id;

    // Check if there are any users associated with this store
    const { data: usersInStore, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('store_id', storeIdToDelete);

    if (usersError) {
      console.error('Supabase fetch users in store error:', usersError.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error checking users in store', 
        error: usersError.message 
      });
    }

    if (usersInStore && usersInStore.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete store with associated users. Please reassign or delete users first.' 
      });
    }

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeIdToDelete);

    if (error) {
      console.error('Supabase delete store error:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error deleting store', 
        error: error.message 
      });
    }

    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
});

module.exports = router;
