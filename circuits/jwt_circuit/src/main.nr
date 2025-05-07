use jwt::JWT;

global MAX_PARTIAL_DATA_LENGTH: u32 = 1024;
global MAX_DOMAIN_LENGTH: u32 = 64;
global MAX_EMAIL_LENGTH: u32 = 128;

fn main(
    partial_data: BoundedVec<u8, MAX_PARTIAL_DATA_LENGTH>,
    partial_hash: [u32; 8],
    full_data_length: u32,
    base64_decode_offset: u32,
    jwt_pubkey_modulus_limbs: pub [u128; 18],
    jwt_pubkey_redc_params_limbs: [u128; 18],
    jwt_signature_limbs: [u128; 18],
    domain: pub BoundedVec<u8, MAX_DOMAIN_LENGTH>
) {
    let jwt = JWT::init_with_partial_hash(
        partial_data,
        partial_hash,
        full_data_length,
        base64_decode_offset,
        jwt_pubkey_modulus_limbs,
        jwt_pubkey_redc_params_limbs,
        jwt_signature_limbs,
    );
    jwt.verify();

    jwt.assert_claim_bool("email_verified".as_bytes(), true);

    let email: BoundedVec<u8, MAX_EMAIL_LENGTH> = jwt.get_claim_string("email".as_bytes());

    // Safety: get_domain_start_index_in_email does not access out-of-bounds memory and returns a valid index or 0.
    let domain_start_index = unsafe { get_domain_start_index_in_email(email) };

    assert(email.storage()[domain_start_index - 1] == 64, "char before domain is not '@'");
    for i in 0..MAX_DOMAIN_LENGTH {
        assert(email.storage()[domain_start_index + i] == domain.storage()[i], "invalid domain");
    }
}


unconstrained fn get_domain_start_index_in_email(email: BoundedVec<u8, MAX_EMAIL_LENGTH>) -> u32 {
    let mut domain_start_index = 0;
    for i in 0..MAX_EMAIL_LENGTH {
        if email.storage()[i] == ("@".as_bytes())[0] {
            domain_start_index = i + 1;
            break;
        }
    }

    domain_start_index
}
