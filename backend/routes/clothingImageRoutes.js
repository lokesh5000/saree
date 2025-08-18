const express = require('express');
const supabase = require('../supabaseService');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/clothing-images/upload
// @desc    Admin/Super-Admin uploads a new clothing image
// @access  Private (Admin, Super-Admin)
router.post('/upload', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  // For now, we'll assume imageUrl is provided in the body.
  // In a real application, this would involve file upload handling (e.g., Supabase Storage).
  const { imageUrl, clothingNumber, version, name } = req.body;

  try {
    const { data: newImage, error: insertError } = await supabase
      .from('clothing_images')
      .insert([
        { 
          image_url: imageUrl, 
          clothing_number: clothingNumber, 
          version, 
          name, 
          uploaded_by: req.user.id 
        }
      ])
      .select()
      .single();

    if (insertError) {
        console.error('Supabase insert clothing image error:', insertError.message);
        return res.status(500).json({ msg: 'Server error during image upload' });
    }

    res.status(201).json(newImage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/clothing-images/:id
// @desc    Admin/Super-Admin deletes a clothing image by ID
// @access  Private (Admin, Super-Admin)
router.delete('/:id', protect, authorizeRoles('admin', 'super-admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const { error: deleteError } = await supabase
      .from('clothing_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase delete clothing image error:', deleteError.message);
      return res.status(500).json({ msg: 'Server error during image deletion' });
    }

    res.status(200).json({ msg: 'Clothing image deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/clothing-images
// @desc    Get all clothing images (can be filtered by clothingNumber and version)
// @access  Public (for now, will restrict by store later)
router.get('/', async (req, res) => {
  try {
    const { clothingNumber, version } = req.query;
    let query = supabase.from('clothing_images').select('*, users(username)');

    if (clothingNumber) {
      query = query.eq('clothing_number', clothingNumber);
    }
    if (version) {
      query = query.eq('version', version);
    }

    const { data: images, error } = await query;

    if (error) {
        console.error('Supabase fetch clothing images error:', error.message);
        return res.status(500).json({ msg: 'Server error fetching clothing images' });
    }
    res.json(images);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
