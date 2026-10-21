import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSuccessMessage, buildErrorMessage, entityLabel } from '../src/http/responseMessages.js';

test('entity labels are human readable', () => {
  assert.equal(entityLabel('BlogComment'), 'Blog comment');
  assert.equal(entityLabel('RepresentativeInfo'), 'Representative');
  assert.equal(entityLabel(null), 'Resource');
});

test('generic success messages become entity specific', () => {
  assert.equal(buildSuccessMessage({ entity: 'Listing', method: 'POST', statusCode: 201, message: 'Created' }), 'Listing created successfully');
  assert.equal(buildSuccessMessage({ entity: 'User', method: 'PUT', message: 'OK' }), 'User updated successfully');
  assert.equal(buildSuccessMessage({ entity: 'Category', method: 'DELETE', message: 'Deleted' }), 'Category deleted successfully');
  assert.equal(buildSuccessMessage({ entity: 'Blog', method: 'GET' }), 'Blog retrieved successfully');
});

test('specific messages pass through unchanged', () => {
  assert.equal(buildSuccessMessage({ entity: 'Auth', method: 'POST', message: 'Signed in successfully' }), 'Signed in successfully');
  assert.equal(buildErrorMessage({ entity: 'User', statusCode: 409, message: 'Cannot remove the last admin' }), 'Cannot remove the last admin');
});

test('generic errors become entity specific', () => {
  assert.equal(buildErrorMessage({ entity: 'User', statusCode: 404, message: 'Not found' }), 'User not found');
  assert.equal(buildErrorMessage({ entity: 'Product', method: 'POST', statusCode: 500, message: 'Failed' }), 'Failed to create product');
  assert.equal(buildErrorMessage({ entity: 'User', statusCode: 403, message: 'Forbidden' }), 'You do not have permission to perform this action');
});

test('internal error details are not leaked on 5xx', () => {
  const msg = buildErrorMessage({ entity: 'Listing', method: 'PUT', statusCode: 500, message: 'Invalid `prisma.listing.update()` invocation' });
  assert.equal(msg, 'Failed to update listing');
});
