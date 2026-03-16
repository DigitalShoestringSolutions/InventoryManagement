from django.db import models
from django.utils import timezone
import datetime
from . import utils


class InventoryItem(models.Model):
    id = models.CharField(max_length=32, primary_key=True)
    quantity_per_unit = models.CharField(
        max_length=100, blank=True, null=True
    )  # Assuming this is a descriptive field
    minimum_unit = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return utils.get_name(self.id)

class LocationLimit(models.Model):
    id = models.BigAutoField(primary_key=True)
    item_id = models.ForeignKey(InventoryItem,on_delete=models.CASCADE,related_name="location_limits")
    location_id = models.CharField(max_length=32)
    minimum_unit = models.IntegerField()

    class Meta:
        unique_together = (
            "item_id",
            "location_id",
        )

    def __str__(self):
        return f"{utils.get_name(self.item_id.id)} - {utils.get_name(self.location_id)}: {self.minimum_unit}"

class InventoryAllocation(models.Model):
    id = models.BigAutoField(primary_key=True)
    item_id = models.ForeignKey(InventoryItem,on_delete=models.CASCADE,related_name="allocations")
    allocated_quantity = models.IntegerField()
    reference = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)
    expected_completion = models.DateTimeField(blank=True,null=True)
    
    # enforce unique item_id + reference combination
    class Meta:
        unique_together = (
            "item_id",
            "reference",
        )

    def __str__(self):
        return f"{utils.get_name(self.item_id.id)}: {self.allocated_quantity}"
    
class AllocationFulfillment(models.Model):
    id = models.BigAutoField(primary_key=True)
    allocation = models.ForeignKey(InventoryAllocation,on_delete=models.CASCADE,related_name="fulfillments")
    withdrawal_id = models.IntegerField()
    quantity = models.IntegerField()

    def __str__(self):
        return f"Fulfillment of {self.allocation.id}: {self.quantity}"