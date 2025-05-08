use sha256::sha256_var;

global NUM_INPUTS: u32 = 10;

fn main(inputs: [[u8; 32]; NUM_INPUTS], actual_input_count: pub u32, published_hash: pub [u8; 32]) {
    // Hash each input up to actual_input_count
    let mut current_hash: [u8; 32] = [0; 32];
    let mut first_input_found = false;

    for i in 0..NUM_INPUTS {
        if i < actual_input_count {
            let input_hash: [u8; 32] = sha256_var(inputs[i], 32);

            if !first_input_found {
                current_hash = input_hash;
                first_input_found = true;
            } else {
                let mut concat: [u8; 64] = [0; 64];
                for j in 0..32 {
                    concat[j] = current_hash[j];
                    concat[32 + j] = input_hash[j];
                }
                current_hash = sha256_var(concat, 64);
            }
        }
    }

    // Make sure the final hash matches the published root
    assert(current_hash == published_hash);
}
