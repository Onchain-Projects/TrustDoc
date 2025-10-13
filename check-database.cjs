const { createClient } = require('@supabase/supabase-js');

// You need to add your Supabase credentials here
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database proofs...\n');
  
  try {
    const { data: proofs, error } = await supabase
      .from('proofs')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`📊 Found ${proofs.length} proofs in database\n`);
    
    proofs.forEach((proof, index) => {
      console.log(`--- Proof ${index + 1} ---`);
      console.log('Issuer ID:', proof.issuer_id);
      console.log('Batch:', proof.batch);
      console.log('Merkle Root:', proof.merkle_root);
      console.log('Created:', proof.created_at);
      
      if (proof.proof_json && proof.proof_json.proofs) {
        const proofData = proof.proof_json.proofs[0];
        if (proofData && proofData.leaves) {
          console.log('Document Hashes in this proof:');
          proofData.leaves.forEach((hash, i) => {
            console.log(`  Doc ${i + 1}: ${hash}`);
          });
        }
      }
      console.log('');
    });
    
    console.log('💡 SOLUTION:');
    console.log('1. Delete old proofs from database');
    console.log('2. Re-upload documents using NEW keccak256 method');
    console.log('3. Then verification will work!');
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkDatabase();
