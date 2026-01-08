from django.contrib import admin
from . import utils

from . import models

@admin.register(models.InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ["fetched_name", "quantity_per_unit", "minimum_unit"]
    fields = ["id", "fetched_name", "quantity_per_unit", "minimum_unit"]
    readonly_fields = ("fetched_name",)

    def fetched_name(self, obj):
        return utils.get_name(obj.id)


admin.site.register(models.LocationLimit)
class LocationLimitAdmin(admin.ModelAdmin):
    list_display = ["fetched_item_name", "fetched_location_name","minimum_unit"]
    fields = ["item_id", "fetched_item_name", "location_id", "fetched_location_name", "minimum_unit"]
    readonly_fields = ["fetched_item_name","fetched_location_name"]

    def fetched_item_name(self, obj):
        return utils.get_name(obj.item_id)

    def fetched_location_name(self, obj):
        return utils.get_name(obj.location_id)
