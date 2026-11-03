<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_login(): void
    {
        $registerResponse = $this->postJson('/api/register', [
            'name' => 'Nguyen Van A',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $registerResponse
            ->assertCreated()
            ->assertJsonPath('user.name', 'Nguyen Van A')
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role', 'user')
            ->assertJsonStructure(['token', 'user']);

        $this->assertDatabaseHas('users', [
            'name' => 'Nguyen Van A',
            'email' => 'test@example.com',
        ]);
        $registeredUser = User::where('email', 'test@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('password123', $registeredUser->password));
        $this->assertSame($registerResponse->json('token'), $registeredUser->api_token);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role', 'user')
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_admin_can_access_admin_route_but_not_customer_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->getJson('/api/me')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->getJson('/api/admin')
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_authenticated_user_can_update_personal_profile_without_changing_role_or_email(): void
    {
        $user = User::factory()->create([
            'name' => 'Profile User',
            'email' => 'profile@example.com',
            'role' => 'user',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->putJson('/api/me', [
                'name' => 'Updated Name',
                'phone' => '0901234567',
                'address' => 'Ho Chi Minh City',
                'role' => 'admin',
                'email' => 'changed@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.phone', '0901234567')
            ->assertJsonPath('data.address', 'Ho Chi Minh City')
            ->assertJsonPath('data.email', 'profile@example.com')
            ->assertJsonPath('data.role', 'user');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'profile@example.com',
            'role' => 'user',
        ]);
    }

    public function test_protected_routes_reject_missing_tokens_and_non_admin_users(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->getJson('/api/admin')->assertUnauthorized();

        $user = User::factory()->create(['role' => 'user']);

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->getJson('/api/admin')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->postJson('/api/categories', ['cat_name' => 'Blocked category'])
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->getJson('/api/orders')
            ->assertOk();
    }

    public function test_admin_accounts_cannot_access_customer_profile_or_order_routes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $headers = ['Authorization' => 'Bearer '.$admin->api_token];

        $this->getJson('/api/me', $headers)->assertForbidden();
        $this->putJson('/api/me', [
            'name' => 'Changed Admin Name',
            'phone' => '0900000000',
            'address' => 'Customer address',
        ], $headers)->assertForbidden();
        $this->getJson('/api/orders', $headers)->assertForbidden();
        $this->getJson('/api/admin', $headers)->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'name' => $admin->name,
            'phone' => null,
            'address' => null,
        ]);
    }

    public function test_logout_revokes_the_bearer_token(): void
    {
        $user = User::factory()->create();
        $token = $user->api_token;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'api_token' => null,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_login_rejects_invalid_credentials_and_rotates_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'correct-password',
        ]);
        $oldToken = $user->api_token;

        $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'incorrect-password',
        ])->assertUnprocessable();

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'correct-password',
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertNotSame($oldToken, $response->json('token'));

        $this->withHeader('Authorization', 'Bearer '.$oldToken)
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_customer_and_admin_login_are_separated_and_wrong_portal_does_not_rotate_token(): void
    {
        $customer = User::factory()->create([
            'email' => 'portal-customer@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);
        $admin = User::factory()->create([
            'email' => 'portal-admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);
        $customerToken = $customer->api_token;
        $adminToken = $admin->api_token;

        $this->postJson('/api/login/admin', [
            'email' => $customer->email,
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->postJson('/api/login/customer', [
            'email' => $admin->email,
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('users', ['id' => $customer->id, 'api_token' => $customerToken]);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'api_token' => $adminToken]);

        $this->postJson('/api/login/customer', [
            'email' => $customer->email,
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.role', 'user');

        $this->postJson('/api/login/admin', [
            'email' => $admin->email,
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.role', 'admin');
    }

    public function test_locked_accounts_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'email' => 'locked@example.com',
            'password' => 'password123',
            'is_locked' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$user->api_token)
            ->getJson('/api/me')
            ->assertUnauthorized();

        $this->postJson('/api/login', [
            'email' => 'locked@example.com',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_local_registration_and_login_keep_user_accounts_non_admin(): void
    {
        config(['app.env' => 'local']);

        $registerResponse = $this->postJson('/api/register', [
            'name' => 'Local User',
            'email' => 'local-user@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $registerResponse
            ->assertCreated()
            ->assertJsonPath('user.role', 'user');

        $this->assertDatabaseHas('users', [
            'email' => 'local-user@example.com',
            'role' => 'user',
        ]);

        $firstUser = User::factory()->create([
            'email' => 'first-local-user@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $this->postJson('/api/login', [
            'email' => $firstUser->email,
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'user');

        $secondUser = User::factory()->create([
            'email' => 'second-local-user@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $this->postJson('/api/login', [
            'email' => $secondUser->email,
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'user');
    }

    public function test_registration_does_not_grant_admin_role_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->postJson('/api/register', [
            'name' => 'Production User',
            'email' => 'production-user@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'user');
    }
}
